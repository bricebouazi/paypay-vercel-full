import crypto from 'crypto';
import forge from 'node-forge';

export function loadPrivateKeyFromEnv() {
  let key = env.PRIVATE_KEY;
  if (!key) throw new Error('PRIVATE_KEY manquante');
  key = key.replace(/\\n/g, '\n').trim();
  try {
    forge.pki.privateKeyFromPem(key); // Testa se forge aceita
    console.log('private key loaded and valid for node-forge.');
    return key;
  } catch (e) {
    throw new Error('Chave privada inválida para node-forge: ' + e.message);
  }
}

export function generateRequestNo() {
  return crypto.randomBytes(16).toString('hex');
}

export function generateTimestamp() {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export function encryptBizContent(bizContent, privateKey) {
  const buffer = Buffer.from(bizContent, 'utf8');
  const chunkSize = 117;
  const chunks = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(
      crypto.privateEncrypt(
        { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        buffer.slice(i, i + chunkSize)
      )
    );
  }
  return Buffer.concat(chunks).toString('base64');
}

export function generateSignature(params, privateKey) {
  const keys = Object.keys(params).filter(k => k !== 'sign' && k !== 'sign_type').sort();
  const str = keys.map(k => `${k}=${params[k]}`).join('&');
  const keyObj = forge.pki.privateKeyFromPem(privateKey);
  const md = forge.md.sha1.create();
  md.update(str, 'utf8');
  return forge.util.encode64(keyObj.sign(md));
}
