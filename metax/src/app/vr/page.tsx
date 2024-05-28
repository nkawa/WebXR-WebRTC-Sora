"use client";
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import Sora, {
  type SoraConnection,
  type SignalingNotifyMessage,
  ConnectionSubscriber,
} from "sora-js-sdk";

import type { Navigator } from "webxr";

import { WebXRButton } from "../../vendor/util/webxr-button";

import { Scene, WebXRView } from "../../vendor/render/scenes/scene";
import {
  Renderer,
  createWebGLContext,
} from "../../vendor/render/core/renderer";
//import {Gltf2Node} from '../vendor/render/nodes/gltf2.js';
import { VideoboxNode } from "../../vendor/render/nodes/videobox";
import { InlineViewerHelper } from "../../vendor/util/inline-viewer-helper";

import { VideoNode } from "../../vendor/render/nodes/video";

import TopNavi from "../../components/TopNavi";

class SoraClient {
  private label: string;

  private debug = false;

  private channelId: string;
  private metadata: { access_token: string };
  private options: object;

  private sora: SoraConnection;
  private connection: ConnectionSubscriber;

  constructor(
    label: string,
    signalingUrl: string,
    channelIdPrefix: string,
    channelIdSuffix: string,
    accessToken: string
  ) {
    this.label = label;

    this.sora = Sora.connection(signalingUrl, this.debug);
    this.channelId = `${channelIdPrefix}${channelIdSuffix}`;
    this.metadata = { access_token: accessToken };
    this.options = {};

    //    this.connection = this.sora.sendrecv(
    this.connection = this.sora.recvonly(
      this.channelId,
      this.metadata,
      this.options
    );

    this.connection.on("notify", this.onnotify.bind(this));
    this.connection.on("track", this.ontrack.bind(this));
    this.connection.on("removetrack", this.onremovetrack.bind(this));

    console.log("SoraClient init;" + label);
    console.log(this.sora);
  }

  async connect(): Promise<void> {
    await this.connection.connect();
  }

  async disconnect(): Promise<void> {
    await this.connection.disconnect();
    const localVideo = document.querySelector<HTMLVideoElement>(`#local-video`);
    if (localVideo !== null) {
      localVideo.srcObject = null;
    } else {
    }
    // お掃除
    const remoteVideos = document.querySelector(`#remote-videos`);
    if (remoteVideos) {
      remoteVideos.innerHTML = "";
    }
  }

  private onnotify(event: SignalingNotifyMessage): void {
    if (
      event.event_type === "connection.created" &&
      this.connection.connectionId === event.connection_id
    ) {
      console.log("Notify on notify:" + event.connection_id);
      console.log(event);
    }
  }

  private ontrack(event: RTCTrackEvent): void {
    console.log("OnTrack!", event);
    const stream = event.streams[0];
    const remoteVideoId = `remote-video-${stream.id}`;
    const remoteVideos = document.querySelector(`#remote-videos`);
    if (remoteVideos && !remoteVideos.querySelector(`#${remoteVideoId}`)) {
      console.log("Set Media Stream", typeof stream, "::", stream);
      const remoteVideo = document.createElement("video");
      remoteVideo.id = remoteVideoId;
      remoteVideo.style.border = "1px solid";
      remoteVideo.autoplay = true;
      remoteVideo.playsInline = true;
      remoteVideo.controls = true;
      remoteVideo.width = 320;
      remoteVideo.height = 240;
      const tracks = stream.getTracks();
      console.log("Tracks", tracks);
      try {
        remoteVideo.srcObject = stream;
      } catch (err) {
        console.log("SetMedia Error", err);
      }
      console.log("MeidaSrc:=", remoteVideo.src);
      console.log("MeidaSrcObject:=", remoteVideo.srcObject);
      remoteVideos.appendChild(remoteVideo);
    }
  }

  private onremovetrack(event: MediaStreamTrackEvent): void {
    const target = event.target as MediaStream;
    const remoteVideo = document.querySelector(`#remote-video-${target.id}`);
    if (remoteVideo) {
      document.querySelector(`#remote-videos`)?.removeChild(remoteVideo);
    }
  }
}

const soraClient = new SoraClient(
  "sc01",
  "wss://sora2.uclab.jp/signaling",
  "sora",
  "",
  "token"
);

var hasRun: boolean = false;
const scene = new Scene();
let renderer = null;
let gl: any = null;
let xrImmersiveRefSpace: any = null;
let inlineViewerHelper: any = null;
let newVideo: any = null;

let context = null;
let channel = null;
let person = null;
let xrButton: any = null;

const Page = () => {
  const connectSora = async () => {
    console.log("Connect!");
    await soraClient.connect();
  };
  const disconnectSora = async () => {
    console.log("Discon!");
    await soraClient.disconnect();
  };

  const onRequestSession = () => {
    if (navigator.xr) {
      return navigator.xr.requestSession("immersive-vr").then((session) => {
        xrButton.setSession(session);
        session.isImmersive = true;
        onSessionStarted(session);
      });
    }
  };

  const initXR = () => {
    console.log("Start InitXR");
    xrButton = new WebXRButton({
      onRequestSession: onRequestSession,
      onEndSession: onEndSession,
    });
    document.querySelector("header").appendChild(xrButton.domElement);
    if ("xr" in navigator) {
      console.log("XR is supported");
    } else {
      console.log(navigator);
    }

    if (navigator.xr) {
      console.log("With XR");
      // How about WebXR
      navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
        xrButton.enabled = supported;
      });

      navigator.xr.requestSession("inline").then(onSessionStarted);
    } else {
      console.log("No XR");
    }
  };

  function initGL() {
    if (gl) return;
    console.log("Start InitGL");

    gl = createWebGLContext({
      xrCompatible: true,
    });

    document.body.appendChild(gl.canvas);

    function onResize() {
      gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio;
      gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio;
      // for video
      if (newVideo) {
        newVideo.setAttribute("width", "" + window.innerWidth);
        newVideo.setAttribute("height", "" + window.innerHeight);
      }
    }
    window.addEventListener("resize", onResize);
    onResize();

    renderer = new Renderer(gl);
    scene.setRenderer(renderer);
  }

  function onSessionStarted(session: any) {
    session.addEventListener("end", onSessionEnded);

    initGL();
    scene.inputRenderer.useProfileControllerMeshes(session);
    let glLayer = new XRWebGLLayer(session, gl);
    session.updateRenderState({ baseLayer: glLayer });

    let refSpaceType = session.isImmersive ? "local" : "viewer";
    session.requestReferenceSpace(refSpaceType).then((refSpace: any) => {
      if (session.isImmersive) {
        xrImmersiveRefSpace = refSpace;
      } else {
        inlineViewerHelper = new InlineViewerHelper(gl.canvas, refSpace);
      }
      session.requestAnimationFrame(onXRFrame);
    });
  }

  function onEndSession(session) {
    session.end();
  }

  function onSessionEnded(event) {
    if (event.session.isImmersive) {
      xrButton.setSession(null);
    }
  }

  //ここでポーズ更新
  function onXRFrame(t, frame) {
    let session = frame.session;
    let refSpace = session.isImmersive
      ? xrImmersiveRefSpace
      : inlineViewerHelper.referenceSpace;
    let pose = frame.getViewerPose(refSpace);

    scene.startFrame();

    session.requestAnimationFrame(onXRFrame);

    let glLayer = session.renderState.baseLayer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (pose) {
      let views = [];
      for (let view of pose.views) {
        let renderView = new WebXRView(view, glLayer);

        // It's important to take into account which eye the view is
        // associated with in cases like this, since it informs which half
        // of the stereo image should be used when rendering the view.
        renderView.eye = view.eye;
        views.push(renderView);
      }

      scene.updateInputSources(frame, refSpace);

      scene.drawViewArray(views);
    }

    scene.endFrame();
  }

  // ページが開いたら１回だけ実行される処理
  const doit = () => {
    console.log("Initialize XR");
    initXR();
  };

  useEffect(() => {
    // ページが開かれた時に実行される関数
    if (!hasRun) {
      hasRun = true;
      console.log("doit!");
      doit();
    }
  }, []); // 空の配列を渡すことで、初回レンダリング時のみ実行されます

  return (
    <header>
      <div>
        <h1>VR test</h1>
        <div>
          <button onClick={connectSora}>connect</button>
          <button onClick={disconnectSora}>stop</button>
          <br />
          <div id="remote-videos"></div>
        </div>
      </div>
    </header>
  );
};

export default Page;
