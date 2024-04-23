# WebXR-WebRTC-Sora

Virtual Communication using WebRTC-SORA

開発方針:　 Sora と通信できる簡単な WebXR アプリをまずは作る
　・次のステップとして、両目ステレオ視がやりたい。
　・Meta Quest 等では、 Hand Tracking/Controller Tracking もしたい
　・Tracking の結果を Data Channel 　で伝送したい

-
- node js: 20.12.2 (LTS)
- React を使う　 (React : )
- Create React App は、そろそろ古い？みたいなので、Vite を使ってみる？
- フレームワークとしては next.js を利用
- まずは Web で普通に WebRTC を使えるようにする
  　　　 SORA Javascript SDK 　をちゃんと使う

ーーー
pnpm create next-app
で metax を作成

cd metax
pnpm dev

で開発用サーバが起動する
