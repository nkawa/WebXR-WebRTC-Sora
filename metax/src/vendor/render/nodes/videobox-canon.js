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
import { VideoBoxTexture, VideoboxMaterial} from './videobox';

const GL = WebGLRenderingContext; // For enums

export class InvVideoboxNode extends Node {
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
      let theta = Math.PI*15/180+ i * Math.PI *(150/180 )/ latSegments; // up-down 100 degree...
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
        let phi =  (j * 2 * Math.PI *((170+diff)/360) / lonSegments) + this._rotationY + Math.PI*(180-diff)/360; // left-right 150 degree
        let x = Math.sin(phi) * sinTheta*10;
        let y = cosTheta *15;
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
        this._material.texCoordScaleOffset.value = [0.5, 1.0, 0.5, 0.0,
                                              0.5, 1.0, 0.0, 0.0];
        break;
        case 'stereoRightLeft':
          this._material.texCoordScaleOffset.value = [0.5, 1.0, 0.5, 0.0,
                                                0.5, 1.0, 0.0, 0.0];
          break;

    }

    let renderPrimitive = renderer.createRenderPrimitive(primitive, this._material);
    this.addRenderPrimitive(renderPrimitive);
  }
}
