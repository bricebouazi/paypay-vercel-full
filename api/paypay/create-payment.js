import axios from 'axios';
import qs from 'qs';
import {
  loadPrivateKeyFromEnv,
  generateRequestNo,
  generateTimestamp,
  encryptBizContent,
  generateSignature
} from '../../lib/crypto.js';

const config = {
  partnerId: process.env.PARTNER_ID,
  apiUrl: 'https://gateway.paypayafrica.com/recv.do',
  saleProductCode: '050200030',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, subject = 'Compra' } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });

    const privateKey = loadPrivateKeyFromEnv();

    const biz = {
      cashier_type: 'SDK',
      payer_ip: '102.222.44.1',
      sale_product_code: config.saleProductCode,
      timeout_express: '40m',
      trade_info: {
        currency: 'AOA',
        out_trade_no: Date.now().toString(),
        payee_identity: config.partnerId,
        payee_identity_type: '1',
        price: (+amount).toFixed(2),
        quantity: '1',
        subject,
        total_amount: (+amount).toFixed(2),
      }
    };

    const encrypted = encryptBizContent(JSON.stringify(biz), privateKey);

    const params = {
      charset: 'UTF-8',
      biz_content: encrypted,
      partner_id: config.partnerId,
      service: 'instant_trade',
      request_no: generateRequestNo(),
      format: 'JSON',
      sign_type: 'RSA',
      version: '1.0',
      timestamp: generateTimestamp(),
      language: 'pt'
    };

    params.sign = generateSignature(params, privateKey);

    const response = await axios.post(
      config.apiUrl,
      qs.stringify(params),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
