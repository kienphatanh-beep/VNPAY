import express from "express";
import cors from "cors";
import "dotenv/config";
import { VNPay } from "vnpay";

const app = express();
app.use(cors());
app.use(express.json());

const vnpay = new VNPay({
  tmnCode: process.env.VNP_TMN_CODE,
  secureSecret: process.env.VNP_HASH_SECRET,
  testMode: true, 
});

// 1. API Tạo URL thanh toán
app.post("/payment", (req, res) => {
  const { amount, orderId } = req.body;
  const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // FIX LỖI TIỀN: VNPay yêu cầu VND * 100. 
  // Ví dụ: 10,000 VND -> gửi 1000000
  const vnpUrl = vnpay.buildPaymentUrl({
    vnp_Amount: amount * 100, 
    vnp_IpAddr: ipAddr,
    vnp_TxnRef: orderId.toString(),
    vnp_OrderInfo: `Thanh toan don hang #${orderId}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: `http://localhost:3000/vnpay-callback`, // Node hứng trước để verify
  });

  res.json({ url: vnpUrl });
});

// 2. API Verify và Redirect về React (localhost:8081/cart)
app.get("/vnpay-callback", (req, res) => {
  const query = req.query;
  const verify = vnpay.verifyReturnUrl(query);

  if (verify.isSuccess && query.vnp_ResponseCode === "00") {
    // THÀNH CÔNG: Quay về giỏ hàng với param success
    res.redirect(`http://localhost:8081/cart?vnpay=success`);
  } else {
    // THẤT BẠI/HỦY: Quay về giỏ hàng với param cancel
    res.redirect(`http://localhost:8081/cart`);
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 VNPay Bridge running on http://localhost:${PORT}`));