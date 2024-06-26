"use client";
import React, { useEffect } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import Sora, {
  type SoraConnection,
  type SignalingNotifyMessage,
  ConnectionPublisher,
} from "sora-js-sdk";

import TopNavi from "../../components/TopNavi";

class SoraClient {
  private label: string;

  private debug = false;

  private channelId: string;
  private metadata: { access_token: string };
  private options: object;

  private sora: SoraConnection;
  private connection: ConnectionPublisher;

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
    this.connection = this.sora.sendrecv(
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

  async connect(stream: MediaStream) {
    await this.connection.connect(stream);
    const localVideo = document.querySelector<HTMLVideoElement>(`#local-video`);
    console.log("LocalVideo:", localVideo, stream);
    if (localVideo) {
      // 自分のビデオを設定する
      localVideo.srcObject = stream;
      localVideo.setAttribute("width", "" + window.innerWidth);
      localVideo.setAttribute("height", "" + window.innerHeight);
      console.log("video:",localVideo)
    }
  }

  async disconnect() {
    await this.connection.disconnect();
    const localVideo = document.querySelector<HTMLVideoElement>(`#local-video`);
    if (localVideo) {
      localVideo.srcObject = null;
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
      const remoteVideo = document.createElement("video");
      remoteVideo.id = remoteVideoId;
      remoteVideo.style.border = "1px solid red";
      remoteVideo.autoplay = true;
      remoteVideo.playsInline = true;
      remoteVideo.controls = true;
 //     remoteVideo.width = 160;
 //     remoteVideo.height = 120;
      remoteVideo.setAttribute("width", "" + window.innerWidth);
      remoteVideo.setAttribute("height", "" + window.innerHeight);
      remoteVideo.srcObject = stream;
      remoteVideos.appendChild(remoteVideo);
      console.log("video:",remoteVideo)

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
  "wss://sora.uclab.jp/signaling",
  "sora",
  "",
  "token"
);

const Page = () => {
  useEffect(() => {
    // ページが開かれた時に実行される関数
    console.log("ページが開かれました");
    // ここに実行したい処理を記述
    doit();
  }, []); // 空の配列を渡すことで、初回レンダリング時のみ実行されます

  const connectSora = async () => {
    console.log("Connect!");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    console.log("UseMedia", stream);
    await soraClient.connect(stream);
  };

  // ページが開いたら１回だけ実行される処理
  const doit = () => {
    console.log("２回実行される？");
  };

  return (
    <div>
      <TopNavi />

      <div>
        <h1>Sendrecv test</h1>
        <div>
          <h2>sendrecv</h2>
          <button onClick={connectSora}>connect</button>
          <button id="stop">stop</button>
          <br />
          <video id="local-video"></video>
          <div id="sendrecv1-connection-id"></div>
          <div id="remote-videos"></div>
        </div>
      </div>
    </div>
  );
};

export default Page;
