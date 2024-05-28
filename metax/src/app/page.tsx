"use client";
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";

import TopNavi from "../components/TopNavi";

var hasRun: boolean = false;

const Page = () => {
  // ページが開いたら１回だけ実行される処理
  const doit = () => {
    //    connectSora();
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
    <div>
      <TopNavi />

      <div>
        <h4>Remote Robotics test</h4>
        <div>
          <br />
          <div id="remote-videos"></div>
        </div>
      </div>
    </div>
  );
};

export default Page;
