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
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { out_trade_no } = req.body;

    if (!out_trade_no) {
      return res.status(400).json({
        success: false,
        error: 'out_trade_no required'
      });
    }

    const privateKey = loadPrivateKeyFromEnv();

    const bizObj = { out_trade_no };

    const encrypted = encryptBizContent(
      JSON.stringify(bizObj),
      privateKey
    );

    const params = {
      charset: 'UTF-8',
      biz_content: encrypted,
      partner_id: process.env.partnerId,
      service: 'trade_query',
      request_no: generateRequestNo(),
      format: 'JSON',
      sign_type: 'RSA',
      version: '1.0',
      timestamp: generateTimestamp(),
      language: 'en'
    };

    params.sign = generateSignature(params, privateKey);

    const response = await axios.post(
      config.apiUrl,
      qs.stringify(params),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const data = response.data;

    if (data.code === 'S0001') {
      return res.json({
        success: true,
        data: data.biz_content
      });
    } else {
      return res.status(400).json({
        success: false,
        error: data.sub_msg || 'Query failed',
        code: data.sub_code || data.code
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
