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


import {Gltf2Node} from '../../vendor/render/nodes/gltf2.js';
//import { VideoboxNode } from "../../vendor/render/nodes/videobox";
import { InlineViewerHelper } from "../../vendor/util/inline-viewer-helper";

import { mat4, vec3} from '../../vendor/render/math/gl-matrix.js';
import { Ray } from '../../vendor/render/math/ray.js';

import { MenuSystem } from '../../vendor/render/nodes/menu-system.js';


import { fetchProfile, MotionController } from '@webxr-input-profiles/motion-controllers'
// This library matches XRInputSource profiles to available controller models for us.

        // The path of the CDN the sample will fetch controller models from.
const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';


import { VideoNode } from "../../vendor/render/nodes/video";

import TopNavi from "../../components/TopNavi";
import { sourceMapsEnabled } from "process";

const  WGLUUrl  = require('../../vendor/wglu/wglu-url.js')
//const wglup = require('../../vendor/wglu/wglu-program.js')
//var vrsup = require('../../vendor/stereo-util.js');
const {VRStereoUtil } = require('../../vendor/stereo-util.js');


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
      console.log("Notify:" + event.connection_id);
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
      console.log("RemoteVideo",remoteVideo.width, remoteVideo.height)
      remoteVideo.width = window.innerWidth;
      remoteVideo.height = window.innerHeight;
      eqrtVideoWidth = 1920; // remoteVideo.width ;// 1920;
      eqrtVideoHeight = 540; //remoteVideo.height;//1080; 
      console.log("RemoteVideoAfter",remoteVideo.width, remoteVideo.height)
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
      newVideo = remoteVideo;

      
    }
  }

  private onremovetrack(event: MediaStreamTrackEvent): void {
    const target = event.target as MediaStream;
    const remoteVideo = document.querySelector(`#remote-video-${target.id}`);
    if (remoteVideo) {
      document.querySelector(`#remote-videos`)?.removeChild(remoteVideo);
    }
    newVideo = null;
  }
}


let ws = null; // websocket 

// UUIDを生成する関数
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// ローカルストレージまたはクッキーからIDを取得する関数
function getDeviceID() {
    // ローカルストレージから取得
    let deviceID = localStorage.getItem('deviceID');

    // ローカルストレージに無い場合はクッキーから取得
    if (!deviceID) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('deviceID=')) {
                deviceID = cookie.substring('deviceID='.length);
                break;
            }
        }
    }

    // どちらにも無い場合は新規生成
    if (!deviceID) {
        deviceID = generateUUID();
        // ローカルストレージに保存
        localStorage.setItem('deviceID', deviceID);
        // クッキーにも保存（オプション）
        document.cookie = `deviceID=${deviceID}; path=/; max-age=31536000`; // 1年間有効
    }

    return deviceID;
}


function initWebSocket() {
  // open WebSocket!
  const cws = new WebSocket("wss://sora2.uclab.jp:9001/");
  cws.addEventListener("open", (ev) => {
      console.log("WebSocket connected", ws);
      // ここで、端末の種別を送るべし
      ws = cws;// グローバル変数を設定

      // ブラウザの情報
      console.log('ブラウザ名:', navigator.appName);
      console.log('ブラウザのバージョン:', navigator.appVersion);
      console.log('ユーザーエージェント:', navigator.userAgent);
      // プラットフォームの情報
      console.log('プラットフォーム:', navigator.platform);
      // その他の情報
      console.log('cookieが有効か:', navigator.cookieEnabled);
      const info = {
          host: getDeviceID(),
          device: {
              brwoser: navigator.appName,
              version: navigator.appVersion,
              agent: navigator.userAgent,
              platform: navigator.platform,
              cookie: navigator.cookieEnabled
          }
      }
      ws.send(JSON.stringify(info))
  })
  cws.addEventListener("close", (ev) => {
      console.log("WebSocket cloed", ev);
      ws = null;

      // ちょっと待ってから再接続
      setTimeout(initWebSocket, 1000)
      // try to reconnect?
  })
  cws.onmessage = function (message) {
      // サーバからのメッセージで、動作を変更することも可能


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
let isAR = false;
let xrSession: XRSession;
let stereoUtil = null;


let renderer = null;
let gl: any = null;
let xrImmersiveRefSpace: any = null;
let inlineViewerHelper: any = null;
let newVideo: any = null;
let videoNode : any = null;

let context = null;
let channel = null;
let person = null;
let xrButton: any = null;
let xrRefSpace :any  = null;

let lastSent = 0;

let xrFramebuffer = null;
let xrGLFactory = null;
let projLayer = null;
let eqrtLayer = null;
let eqrtVideoElement = null;
let eqrtVideoWidth = 0;
let eqrtVideoHeight = 0;
let eqrtVideoNeedsUpdate = false;
let eqrtVideoLayout = 'stereo-left-right';
let menuSystem = null;

const Page = () => {
  const connectSora = async () => {
    console.log("Connect!");
    await soraClient.connect();
  };
  const disconnectSora = async () => {
    console.log("Discon!");
    await soraClient.disconnect();
  };
  const checkVideo = ()=>{
    console.log("Check Video", newVideo.readyState, newVideo.error)
    console.log("Video Size", newVideo.width, newVideo.height)
  }

  const onRequestSession = () => {
    console.log("XR Session Requested")
/*    videoNode = new VideoboxNode({
      displayMode: 'stereoTopBottom',
      rotationY: Math.PI*0.5,
      video:newVideo
    })
    scene.addNode(videoNode)
*/
    // ビデオのアップデート用

    if (navigator.xr) {
      return navigator.xr.requestSession(isAR ? 'immersive-ar' : 'immersive-vr', { requiredFeatures:['layers'], optionalFeatures: ['local-floor', 'bounded-floor'] }).then((session)=>{
        xrButton.setSession(session);
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
    document.querySelector("#xrbutton").appendChild(xrButton.domElement);
//   document.querySelector("header")

    if (navigator.xr) {
      console.log("With XR");
      // How about WebXR
      navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
        if (supported){
          xrButton.enabled = supported;
          isAR = true;
        }
      })
      if (!isAR){
          navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
            xrButton.enabled = supported;
            console.log("immersive-vr",supported,isAR)
          })
      }

//      navigator.xr.requestSession("inline").then(onSessionStarted);
    } else {
      console.log("No XR");
    }
  };

  
  function onInputSourcesChange(event) {
    onSourcesChange(event, "input_");
  }


  function onSourcesChange(event, type) {
    for (let inputSource of event.added) {
        if (inputSource.targetRayMode == 'tracked-pointer') {
            fetchProfile(inputSource, DEFAULT_PROFILES_PATH).then(({ profile, assetPath }) => {
                scene.inputRenderer.setControllerMesh(new Gltf2Node({ url: assetPath }), inputSource.handedness, inputSource.profiles[0]);
            });
        }
    }
}

function updateInputSources(session, frame, refSpace) {
    updateSources(session, frame, refSpace, session.inputSources, "input_");
}

function updateSources(session, frame, refSpace, sources, type) {
  if (session.visibilityState === 'visible-blurred') {
      return;
  }
  for (let inputSource of sources) {
      let hand_type = type + inputSource.handedness;
      if (type == "input_") {
//        console.log("updateSources:",inputSource, refSpace)
          let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);

          if (targetRayPose) {
              if (inputSource.targetRayMode == 'tracked-pointer') {
                  scene.inputRenderer.addLaserPointer(targetRayPose.transform);
              }

              let targetRay = new Ray(targetRayPose.transform);
              let cursorDistance = 2.0;
              let cursorPos = vec3.fromValues(
                  targetRay.origin.x,
                  targetRay.origin.y,
                  targetRay.origin.z
              );
              vec3.add(cursorPos, cursorPos, [
                  targetRay.direction.x * cursorDistance,
                  targetRay.direction.y * cursorDistance,
                  targetRay.direction.z * cursorDistance,
              ]);
              //                        console.log("hand_type", hand_type)
              if (hand_type == "input_right") {
                  const now = Date.now()
                  if (now - lastSent > 40) {
                      let gamepad = inputSource.gamepad
                      let pad = null
                      if (gamepad) {
                       //   console.log("GamePad!:", gamepad.buttons.length, gamepad.buttons[0])
                          pad = {
                              len: gamepad.buttons.length,
                              b0: gamepad.buttons[0].value,
                             bm: gamepad.buttons[1].value || 0,
 //                             bA: gamepad.buttons[4].pressed,
 //                             bB: gamepad.buttons[5].pressed
                          }
                      }
                      var sobj = {
                          //                            hand: hand_type,
                          //                            handness: inputSource.handness,
                          //                            pose: gripPose.transform.matrix,
                          //                            hand: hand_type,
                          pos: targetRayPose.transform.position,
                          ori: targetRayPose.transform.orientation,
                          pad: pad

                          //                pose: pose.transform.position
                      }
                      // Should check WebSocket status
                      if (ws)
                          ws.send(JSON.stringify(sobj))

                      //if (mqclt != null) {
                      //    mqclt.publish('pose', JSON.stringify(sobj), { qos: 0, retain: false })
                      // }
                      lastSent = now

                  } else {
                      //                                console.log("dont send", (now - lastSent), sobj)
                  }
              }
              scene.inputRenderer.addCursor(cursorPos);
          }
      }

      if (!inputSource.hand && inputSource.gripSpace) {// 手が見えてるか
          let gripPose = frame.getPose(inputSource.gripSpace, refSpace);
          if (gripPose) {// Controller を表示？
              scene.inputRenderer.addController(gripPose.transform.matrix, inputSource.handedness, inputSource.profiles[0]);

          } else {
//              scene.inputRenderer.hideController(hand_type);
          }
      }

  }
}

  function initGL() {
    if (gl) return;
    console.log("Start InitGL");

    gl = createWebGLContext({
      xrCompatible: true, webgl2: true
    });
    document.body.appendChild(gl.canvas);
    gl.clearColor(0.0,0,0,0.0);

    function onResize() {
      gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio;
      gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio;

    }
    window.addEventListener("resize", onResize);
    onResize();

    renderer = new Renderer(gl);
    scene.setRenderer(renderer);

    stereoUtil = new VRStereoUtil(gl);
    console.log("StereoUtil",stereoUtil)

  }

  function initButtons(){
    menuSystem = new MenuSystem();

    console.log("InitButtons")
    menuSystem.createButton('../media/textures/backward-button.png', () => { newVideo.currentTime -= 15; });
    menuSystem.createSwitch(
      '../media/textures/pause-button.png', () => newVideo.pause(),
      '../media/textures/play-button.png', () => newVideo.play()
    );
    menuSystem.createButton('../media/textures/forward-button.png', () => { newVideo.currentTime += 15; });
    menuSystem.createButton('../media/textures/x-button.png', () => { xrSession.end() });
    scene.addNode(menuSystem.getMenuBarNode());

  }


  function onSessionStarted(session: any) {
    console.log("onSessionStarted",session)    
    xrSession = session;
    scene.inputRenderer.useProfileControllerMeshes(session);

    initGL();

    setInterval(function () {
      if (newVideo)
        if (newVideo.readyState >= newVideo.HAVE_CURRENT_DATA) {
          eqrtVideoNeedsUpdate = true;
        }
      }, 1000 / 30);

    initButtons()


    xrFramebuffer = gl.createFramebuffer();
    xrGLFactory = new XRWebGLBinding(session, gl);

    console.log("XR WebGLWork!",xrGLFactory)
    if (xrGLFactory == null){
      session.end()
    }

    session.addEventListener("end", onSessionEnded);

    session.addEventListener('inputsourceschange', onInputSourcesChange);
    initWebSocket()
/*
    if (newVideo) {
      console.log("NewVideo! for Add in Scene",newVideo)
      videoNode = new VideoboxNode({
                displayMode: 'stereoTopBottom',
                rotationY: Math.PI*0.5,
                video:newVideo
              })
      scene.addNode(videoNode)
//      newVideo = null // 
    }else{
      console.log("No video")
    }
*/
 
    scene.inputRenderer.useProfileControllerMeshes(session);
    let glLayer = new XRWebGLLayer(session, gl);
//    session.updateRenderState({ baseLayer: glLayer });

//    let refSpaceType = session.isImmersive ? "local" : "viewer";
    let refSpaceType = "local";
    session.requestReferenceSpace(refSpaceType).then((refSpace: any) => {
      xrRefSpace = refSpace.getOffsetReferenceSpace(new XRRigidTransform({x:0,y:0,z:0}));

      projLayer = xrGLFactory.createProjectionLayer({ space: refSpace, stencil: false });
      var spc = {
        space: refSpace,
        viewPixelWidth: eqrtVideoWidth / (eqrtVideoLayout === "stereo-left-right" ? 2 : 1),
        viewPixelHeight: eqrtVideoHeight / (eqrtVideoLayout === "stereo-top-bottom" ? 2 : 1),
        layout: eqrtVideoLayout,
      }
      console.log("Space",spc)
      eqrtLayer = xrGLFactory.createEquirectLayer(spc);

      eqrtLayer.centralHorizontalAngle = Math.PI ;//* 180 /*eqrtVideoAngle*/ // 180;
      eqrtLayer.upperVerticalAngle = Math.PI / 2.0 - 0.2;
      eqrtLayer.lowerVerticalAngle = -Math.PI / 2.0 +0.2;
      eqrtLayer.radius = 20; // eqrtRadius;

      console.log("Request Update State");
      session.updateRenderState({ layers: [eqrtLayer, projLayer] });
      session.requestAnimationFrame(onXRFrame);

    })
//    scene.addNode(new Gltf2Node({ url: '../space/space.gltf' }));

  }

  function onEndSession(session:any) {
    session.end();
  }

  function onSessionEnded(event:any) {
    if (event.session.isImmersive) {
      xrButton.setSession(null);
    }
  }

  //ここでポーズ更新
  function onXRFrame(t:DOMHighResTimeStamp, frame:XRFrame) {
    let session = frame.session;

    scene.startFrame();
    session.requestAnimationFrame(onXRFrame);
    if (eqrtLayer && (eqrtVideoNeedsUpdate || eqrtLayer.needsRedraw)) {
      eqrtVideoNeedsUpdate = false;
      let glayer = xrGLFactory.getSubImage(eqrtLayer, frame);

      // TEXTURE_CUBE_MAP expects the Y to be flipped for the faces and it already
      // is flipped in our texture image.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
//      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, eqrtVideoWidth, eqrtVideoHeight, gl.RGBA, gl.UNSIGNED_BYTE, newVideo);
//console.log(newVideo.width,newVideo.height)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1920, 520, gl.RGBA, gl.UNSIGNED_BYTE, newVideo);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    updateInputSources(session,frame, xrRefSpace)

    //    console.log(frame, session, xrRefSpace)
    let pose = frame.getViewerPose(xrRefSpace);
    if (pose) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, xrFramebuffer);
      gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.COLOR_ATTACHMENT0, gl.DEPTH_ATTACHMENT]);

   //   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      let views = [];
      menuSystem.processInput(frame, scene, xrRefSpace);
//      console.log("View.len", pose.views.length)
      let viewCount = 0;
      for (let view of pose.views) {

        let viewport = null;
        let glLayer = xrGLFactory.getViewSubImage(projLayer, view);
        console.log(viewCount, glLayer)
        glLayer.framebuffer = xrFramebuffer;
        viewport = glLayer.viewport;
        gl.bindFramebuffer(gl.FRAMEBUFFER, xrFramebuffer);
//        console.log("colorText:",glLayer.colorTexture)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glLayer.colorTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, glLayer.depthStencilTexture, 0);
        views.push(new WebXRView(view, glLayer, viewport));
        viewCount += 1
      }
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
        <h1>VR with Sora</h1>
        <div>
          <button onClick={connectSora}>connect</button>
          <button onClick={disconnectSora}>stop</button>
          <button onClick={checkVideo}>checkVideo</button>
          <div id="xrbutton"></div>
          <br />
          <div id="remote-videos"></div>
        </div>
      </div>
    </header>
  );
};

export default Page;
