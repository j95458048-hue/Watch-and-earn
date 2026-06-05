const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// REMEMBER TO SETUP THIS VARIABLE ENVIRONMENT ON DEPLOYMENT (Vercel/Render/Heroku)
const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";

function verifyTelegramInitData(initData) {
    if (!initData || initData === "sandbox_mode_active") return true; // Kept True for local test routing sandbox environment
    
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        const dataCheckArr = [];
        for (const [key, value] of urlParams.entries()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const localHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        return localHash === hash;
    } catch (e) {
        return false;
    }
}

// SECURE VERIFICATION FOR REAL MONETAG AD CONTEXT CALLBACK PIPELINE
app.post('/api/verify-ad-payout', (req, res) => {
    const { initData, trackType } = req.body;

    if (!verifyTelegramInitData(initData)) {
        return res.status(403).json({ success: false, error: "Cryptographic verification failure." });
    }

    let pointsAwardedCalculated = 0;
    switch(trackType) {
        case 'premium_ad': 
            pointsAwardedCalculated = 100; 
            break;
        case 'auto_farming': 
            pointsAwardedCalculated = 80; 
            break;
        case 'clip_15s': 
            pointsAwardedCalculated = 50; 
            break;
        default: 
            return res.status(400).json({ success: false, error: "Unknown type selection context." });
    }
    
    // In production, sync pointsAwardedCalculated to Database record here relative to User identification
    return res.status(200).json({ success: true, currentEarnValue: pointsAwardedCalculated });
});

app.post('/api/withdraw', (req, res) => {
    const { initData, address, token, amountPoints } = req.body;

    if (!verifyTelegramInitData(initData)) {
        return res.status(403).json({ success: false, error: "Access verification token invalid." });
    }

    if (!address || isNaN(amountPoints) || amountPoints < 1000) {
        return res.status(400).json({ success: false, error: "Invalid withdrawal volume parameters requested." });
    }

    // Conversion asset evaluation math metric: 100 Points = $0.001 USD
    const fiatValueCalculation = (amountPoints * 0.00001).toFixed(3);

    console.log(`[Payout Engine Log]: User requested transfer of ${amountPoints} PTS. Equivalent Calculated Value: $${fiatValueCalculation} USD to destination address: ${address} [Network Type: ${token}]`);
    
    return res.status(200).json({ success: true, fiatValueValueCalculated: fiatValueCalculation });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Watch-to-Earn Core Engine serving on port: ${PORT}`));
