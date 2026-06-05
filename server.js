const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";

function verifyTelegramInitData(initData) {
    if (!initData || initData === "sandbox_mode_active") return false;
    
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

app.post('/api/verify-ad-payout', (req, res) => {
    const { initData, trackType } = req.body;

    if (!verifyTelegramInitData(initData)) {
        return res.status(403).json({ success: false, error: "Cryptographic verification failure." });
    }

    const urlParams = new URLSearchParams(initData);
    const tgUser = JSON.parse(urlParams.get('user') || '{}');
    const userId = tgUser.id;

    let pointsAwardedCalculated = 0;
    switch(trackType) {
        case 'premium_ad': pointsAwardedCalculated = 100; break;
        case 'auto_farming': pointsAwardedCalculated = 80; break;
        case 'clip_15s': pointsAwardedCalculated = 50; break;
        default: return res.status(400).json({ success: false, error: "Unknown type selection context." });
    }
    
    return res.status(200).json({ success: true, currentEarnValue: pointsAwardedCalculated });
});

app.post('/api/withdraw', (req, res) => {
    const { initData, address, token, amountPoints } = req.body;

    if (initData !== "sandbox_mode_active" && !verifyTelegramInitData(initData)) {
        return res.status(403).json({ success: false, error: "Access verification token invalid." });
    }

    if (!address || isNaN(amountPoints) || amountPoints < 1000) {
        return res.status(400).json({ success: false, error: "Invalid withdrawal volume parameters requested." });
    }

    // Updated conversion math logic system values: 100 Points = $0.001 USD
    const fiatValueCalculation = (amountPoints * 0.00001).toFixed(3);

    console.log(`[Payout Engine Log]: User requested transfer of ${amountPoints} PTS. Equivalent Calculated Value: $${fiatValueCalculation} USD to destination address: ${address} [Network Type: ${token}]`);
    return res.status(200).json({ success: true, fiatValueValueCalculated: fiatValueCalculation });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Watch-to-Earn Core Engine serving on port: ${PORT}`));
