# WebXR-WebRTC-Sora

Virtual Communication using WebRTC-SORA

開発方針:　 Sora と通信できる簡単な WebXR アプリをまずは作る
　・次のステップとして、両目ステレオ視がやりたい。
　・Meta Quest 等では、 Hand Tracking/Controller Tracking もしたい
　・Tracking の結果を Data Channel 　で伝送したい

- node js: 20.12.2 (LTS)
- React を使う　 (React : )
- Create React App は、そろそろ古い？みたいなので、Vite を使ってみる？
- フレームワークとしては next.js を利用
- まずは Web で普通に WebRTC を使えるようにする
  　　　 SORA Javascript SDK 　をちゃんと使う

- WebXR との連携も実施
  - WebSocket 経由で、右手コントローラの位置、角度、ボタン情報などを送信
  - クラウド上の WebSocket 変換サーバが、WebSocket -> MQTT に変換（これ直したいけど）
  - MQTT -> ロボットアームで遠隔操作
    

--
pnpm create next-app
で metax を作成

 cd metax
 pnpm dev

で開発用サーバが起動する
