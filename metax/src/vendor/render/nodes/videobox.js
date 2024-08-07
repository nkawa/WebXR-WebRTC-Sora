// Copyright 2018 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/*
Node for displaying 360 equirect images as a skybox.
*/

import {Material, RENDER_ORDER} from '../core/material';
import {Primitive, PrimitiveAttribute} from '../core/primitive';
import {Node} from '../core/node';
import {Texture} from '../core/texture';
import { M_PLUS_1 } from 'next/font/google';

const GL = WebGLRenderingContext; // For enums


export class VideoBoxTexture extends Texture {
  constructor(video) {
    super();

    this._video = video;
    console.log("video state", video.readyState);

    if (video.readyState >= 2 ) {
      console.log("Video Starting!")
      this._promise = Promise.resolve(this);
    } else if (video.error) {
      console.log("Video err")
      this._promise = Promise.reject(video.error);
    } else {
      this._promise = new Promise((resolve, reject) => {
        console.log("Video loaded?",this._video.readyState)
        video.addEventListener('loadeddata', () => resolve(this));
        video.addEventListener('error', reject);
      });
    }
  }

  get format() {
    // TODO: Can be RGB in some cases.
    return GL.RGB;
  }

  get width() {
  //  return 1980;
    return this._video.videoWidth;
  }

  get height() {
//    return 2000;

    return this._video.videoHeight;
  }

  waitForComplete() {
    return this._promise;
  }

  get textureKey() {
    return "rtc";
  }

  get source() {
    return this._video;
  }
}


export class VideoboxMaterial extends Material {
  constructor() {
    super();
    this.renderOrder = RENDER_ORDER.SKY;
    this.state.depthFunc = GL.LEQUAL;
    this.state.depthMask = false;

    this.image = this.defineSampler('diffuse');

    this.texCoordScaleOffset = this.defineUniform('texCoordScaleOffset',
                                                      [1.0, 1.0, 0.0, 0.0,
                                                       1.0, 1.0, 0.0, 0.0], 4);
  }

  get materialName() {
    return 'VideoBoxMaterial';
  }

  get vertexSource() {
    console.log("VideoBox Virtex")
    return `
    uniform int EYE_INDEX;
    uniform vec4 texCoordScaleOffset[2];
    attribute vec3 POSITION;
    attribute vec2 TEXCOORD_0;
    varying vec2 vTexCoord;

    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      vec4 scaleOffset = texCoordScaleOffset[EYE_INDEX];
      vTexCoord = (TEXCOORD_0 * scaleOffset.xy) + scaleOffset.zw;
      // Drop the translation portion of the view matrix
      view[3].xyz = vec3(0.0, 0.0, 0.0);
      vec4 out_vec = proj * view * model * vec4(POSITION, 1.0);

      // Returning the W component for both Z and W forces the geometry depth to
      // the far plane. When combined with a depth func of LEQUAL this makes the
      // sky write to any depth fragment that has not been written to yet.
      return out_vec.xyww;
    }`;
  }

  get fragmentSource() {
    return `
    uniform sampler2D diffuse;
    varying vec2 vTexCoord;

    vec4 fragment_main() {
      return texture2D(diffuse, vTexCoord);
    }`;
  }
}

export class VideoboxNode extends Node {
  constructor(options) {
    super();
    this._material = null;
    this._url = options.video.src;
    this._video= options.video;
    this._video_texture =new VideoBoxTexture(this._video);
//    this._video_texture.textureKey="webrtc-vr";
    this._displayMode = options.displayMode || 'mono';
    this._rotationY = options.rotationY ||  Math.PI;
  }
  onUpdate(timestamp, frameDelta) {
 //   console.log("VideoBox: OnUpdate", timestamp, frameDelta)
//    this._video_texture =new VideoBoxTexture(this._video);
//    console.log("upd:",this._material)
//    console.log("upd:",this._video_texture)
//      this.renderPrimitives[0]
//      console.log("video",this._video.readyState, this._video.playbackRate, this._video.currentTime, this._video.paused)
      if (this._video.paused){
        console.log("Video is paused");
        this._video.play();
      }
      this._video.updateTexture();
  }

  onRendererChanged(renderer) {
    console.log("VideoBox:Renderer.changed",renderer)
    let vertices = [];
    let indices = [];

    let latSegments = 40;
    let lonSegments = 40;



    // Create the vertices/indices
    for (let i=0; i <= latSegments; ++i) {
      let theta = Math.PI*65/180+ i * Math.PI *(50/180 )/ latSegments; // up-down 100 degree...
      let sinTheta = Math.sin(theta); // hankei
//      let sinTheta = 1+(1-Math.sin(theta)); // Math.sin(theta); //Math.sin(theta); // hankei
          
//      let cosTheta = Math.cos(theta);
      let cosTheta = Math.cos(theta);

      let idxOffsetA = i * (lonSegments+1);
      let idxOffsetB = (i+1) * (lonSegments+1);
      let diff = (1-sinTheta)*300*1.5;
      console.log("i",i,theta, sinTheta,diff);
        
      for (let j=0; j <= lonSegments; ++j) {
        // 角度が中心に近いほど、視野を狭める
        // theta分で考える　ツマリ、 1-Math.sin(theta)0
        let phi =  (j * 2 * Math.PI *((190+diff)/360) / lonSegments) + this._rotationY + Math.PI*(175-diff)/360; // left-right 150 degree
        let x = Math.sin(phi) * sinTheta*10;
        let y = cosTheta *22;
        let z = -Math.cos(phi) * sinTheta*10;
        let u = (j / lonSegments);
        let v = (i / latSegments);

        // Vertex shader will force the geometry to the far plane, so the
        // radius of the sphere is immaterial.
        vertices.push(x, y, z, u, v);

        if (i < latSegments && j < lonSegments) {
          let idxA = idxOffsetA+j;
          let idxB = idxOffsetB+j;

          indices.push(idxA, idxB, idxA+1,
                       idxB, idxB+1, idxA+1);
        }
      }
    }

    let vertexBuffer = renderer.createRenderBuffer(GL.ARRAY_BUFFER, new Float32Array(vertices));
    let indexBuffer = renderer.createRenderBuffer(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices));

    let attribs = [
      new PrimitiveAttribute('\POSITION', vertexBuffer, 3, GL.FLOAT, 20, 0),
      new PrimitiveAttribute('TEXCOORD_0', vertexBuffer, 2, GL.FLOAT, 20, 12),
    ];

    let primitive = new Primitive(attribs, indices.length);
    primitive.setIndexBuffer(indexBuffer);

    this._material = new VideoboxMaterial();
    this._material.image.texture = this._video_texture;
    console.log("Material",this._material);

    switch (this._displayMode) {
      case 'mono':
        this._material.texCoordScaleOffset.value = [1.0, 1.0, 0.0, 0.0,
                                              1.0, 1.0, 0.0, 0.0];
        break;
      case 'stereoTopBottom':
        this._material.texCoordScaleOffset.value = [1.0, 0.5, 0.0, 0.0,
                                              1.0, 0.5, 0.0, 0.5];
        break;
      case 'stereoLeftRight':
        this._material.texCoordScaleOffset.value = [0.5, 1.0, 0.0, 0.0,
                                              0.5, 1.0, 0.5, 0.0];
        break;
      case 'stereoRightLeft':
          this._material.texCoordScaleOffset.value = [0.5, 1.0, 0.0, 0.0,
                                                0.5, 1.0, 0.5, 0.0];
          break;
    }

    let renderPrimitive = renderer.createRenderPrimitive(primitive, this._material);
    this.addRenderPrimitive(renderPrimitive);
  }
}
