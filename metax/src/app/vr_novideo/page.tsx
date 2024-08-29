"use client";
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";

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
//const {VRStereoUtil } = require('../../vendor/stereo-util.js');

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
  try {
    const cws = new WebSocket("wss://sora2.uclab.jp:9001/");
    cws.addEventListener("error", (ev)=>{
    console.log("WebSocket wrror", ev);
  })
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
      console.log("WebSocket 送信OK");
  })
  cws.addEventListener("close", (ev) => {
      console.log("WebSocket cloed", ev);
      ws = null;

      // ちょっと待ってから再接続
//      setTimeout(initWebSocket, 1000)
      // try to reconnect?
  })
  cws.onmessage = function (message) {
      // サーバからのメッセージで、動作を変更することも可能


  }
  }catch(e){
    console.log("WebSoket err:", e);

  }

}



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

let xrFramebuffer:any = null;
let xrGLFactory:any = null;
let projLayer:any = null;
let eqrtLayer:any = null;
let eqrtVideoElement = null;
let eqrtVideoWidth = 0;
let eqrtVideoHeight = 0;
let eqrtVideoNeedsUpdate = false;
let eqrtVideoLayout = 'stereo-left-right';
let menuSystem = null;
let withLayer = false;

const Page = () => {
  const connectSora = async () => {
  };
  const disconnectSora = async () => {
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

      return navigator.xr.requestSession(isAR ? 'immersive-ar' : 'immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] }).then((session)=>{
//        withLayer = true;
        xrButton.setSession(session);
        onSessionStarted(session);
        console.log("WithLayerOK but no layer")
      })
      .catch((error) =>{
        console.log("Error on setSession", error);
        return navigator.xr.requestSession(isAR ? 'immersive-ar' : 'immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] }).then((session)=>{
          xrButton.setSession(session);
          onSessionStarted(session);
        })
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
//          console.log("updateSources:",inputSource, refSpace)
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
//              console.log("hand_type", hand_type)
              if (hand_type == "input_right") {
                  const now = Date.now()
                  if (now - lastSent > 40) {
                      let gamepad = inputSource.gamepad
                      let pad = null
                      if (gamepad) {
 //                         console.log("GamePad!:", gamepad.buttons.length, gamepad.buttons[0])
                          pad = {
                              len: gamepad.buttons.length,
                              b0: gamepad.buttons[0].value || 0,
                             bm: gamepad.buttons[1].value || 0,
                              bA: gamepad.buttons[4].pressed || false,
                              bB: gamepad.buttons[5].pressed || false
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

//    stereoUtil = new VRStereoUtil(gl);
//    console.log("StereoUtil",stereoUtil)

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

    if (newVideo){
    setInterval(function () {
      if (newVideo)
        if (newVideo.readyState >= newVideo.HAVE_CURRENT_DATA) {
          eqrtVideoNeedsUpdate = true;
        }
      }, 1000 / 30);
    }

    initButtons()

    xrFramebuffer = gl.createFramebuffer();
    // NoVideo do not require WebGLLayer
    let glLayer = new XRWebGLLayer(session, gl);
    console.log("Update renderState",glLayer)
    session.updateRenderState({baseLayer:glLayer});
    console.log("Update renderState Done")

    session.addEventListener("end", onSessionEnded);

    session.addEventListener('inputsourceschange', onInputSourcesChange);
    initWebSocket()
 
    scene.inputRenderer.useProfileControllerMeshes(session);

    let refSpaceType = "local";
    // novideo 
    session.requestReferenceSpace(refSpaceType).then((refSpace: any) => {
      xrRefSpace = refSpace.getOffsetReferenceSpace(new XRRigidTransform({x:0,y:0,z:0}));
      session.requestAnimationFrame(onXRFrame);

    })

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
//      let viewCount = 0;

      if (withLayer){
        console.log("WithLayer device")
        for (let view of pose.views) {

          let viewport = null;
        //
          if (projLayer){
            let glLayer = xrGLFactory.getViewSubImage(projLayer, view);
//        console.log(viewCount, glLayer)
            glLayer.framebuffer = xrFramebuffer;
            viewport = glLayer.viewport;
            gl.bindFramebuffer(gl.FRAMEBUFFER, xrFramebuffer);
//        console.log("colorText:",glLayer.colorTexture)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glLayer.colorTexture, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, glLayer.depthStencilTexture, 0);
            views.push(new WebXRView(view, glLayer, viewport));
//        viewCount += 1
          }
        }
        if (newVideo){
          scene.drawViewArray(views);
        }else{
          scene.drawXRFrame(frame, pose);
        }

      }else{
//        console.log("no layer")
        scene.drawXRFrame(frame, pose);

      }
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
//      console.log("doit!");
      doit();
    }
  }, []); // 空の配列を渡すことで、初回レンダリング時のみ実行されます

/*         <button onClick={connectSora}>connect</button>
  <button onClick={disconnectSora}>stop</button>
  <button onClick={checkVideo}>checkVideo</button>*/

  return (
    <header>
      <div>
        <h1>WebXR Controller Test(NoVideo) </h1>
        <div>
          <div id="xrbutton"></div>
          <br />
          <div id="remote-videos"></div>
        </div>
      </div>
    </header>
  );
};

export default Page;
