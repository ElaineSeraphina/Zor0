const axios = require('axios');
const fs = require('fs');
const ethers = require('ethers');
const readline = require('readline');
const FormData = require('form-data');
const chalk = require('chalk');

const defaultHeaders = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Chromium\";v=\"134\", \"Not:A-Brand\";v=\"24\", \"Microsoft Edge\";v=\"134\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "Referer": "https://ai.zoro.org/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
};

let REF_CODE;
try {
    REF_CODE = fs.readFileSync('code.txt', 'utf8').trim();
    // Validasi format kode referral
    if (!/^[a-zA-Z0-9]{15}$/.test(REF_CODE)) {
        logError('Invalid referral code format in code.txt');
        logWarning('Referral code should be exactly 15 alphanumeric characters');
        process.exit(1);
    }
    logSuccess(`Using referral code: ${REF_CODE}`);
} catch (error) {
    logError('Error reading code.txt: ' + error.message);
    logWarning('Please create a code.txt file with a valid referral code');
    process.exit(1);
}

const imageMissions = {

const missionRewardIds = [
    "3bb23601-b879-42b4-be72-3e175974604b",
    "31e4891d-9c1e-4ca0-8362-5be848176bf4"
];

const imageUrls = {
    "hamster": "https://images.unsplash.com/photo-1425082661705-1834bfd09dca",
    "cattle": "https://images.unsplash.com/photo-1596733430284-f7437764b1a9",
    "kiwi": "https://images.unsplash.com/photo-1616684000067-36952fde56ec",
    "lemon": "https://images.unsplash.com/photo-1590502593747-42a996133562",
    "lollipop": "https://plus.unsplash.com/premium_photo-1661255468024-de3a871dfc16"
};

function generateRandomUsername() {
    // Helper untuk membuat suku kata random
    function randomSyllable() {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        const vowels = 'aiueo';
        let syll = '';
        syll += consonants[Math.floor(Math.random() * consonants.length)];
        syll += vowels[Math.floor(Math.random() * vowels.length)];
        if (Math.random() > 0.5) {
            syll += consonants[Math.floor(Math.random() * consonants.length)];
        }
        return syll;
    }
    // Nama depan dan belakang: 2-3 suku kata
    function randomName(minSyll, maxSyll) {
        const count = Math.floor(Math.random() * (maxSyll - minSyll + 1)) + minSyll;
        let name = '';
        for (let i = 0; i < count; i++) {
            name += randomSyllable();
        }
        // Kapital huruf pertama
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
    const first = randomName(2, 3);
    const last = randomName(2, 3);
    const number = Math.floor(10 + Math.random() * 90); // 2 digit
    return `${first}${last}${number}`;
}

async function createWallet() {
    try {
        const wallet = ethers.Wallet.createRandom();
        const address = wallet.address;
        const privateKey = wallet.privateKey;

        const loginRequest = await axios.get(
            `https://api.zoro.org/user-auth/wallet/login-request?strategy=ETHEREUM_SIGNATURE&address=${address}`,
            { headers: defaultHeaders }
        );

        const { token, message } = loginRequest.data;
        const signature = await wallet.signMessage(message);

        const loginResponse = await axios.get(
            `https://api.zoro.org/user-auth/login?strategy=ETHEREUM_SIGNATURE&address=${address}&message=${message}&token=${token}&signature=${signature}&inviter=${REF_CODE}`,
            { headers: defaultHeaders }
        );

        const { access_token } = loginResponse.data.tokens;
        let randomUsername;
        let setNicknameSuccess = false;
        let attempts = 0;
        const nicknameHeaders = {
            ...defaultHeaders,
            "authorization": `Bearer ${access_token}`
        };
        // Try up to 5 times to set a valid nickname
        while (!setNicknameSuccess && attempts < 5) {
            randomUsername = generateRandomUsername();
            try {
                await axios.post(
                    `https://api.zoro.org/user/set-nickname?nickname=${randomUsername}`,
                    null,
                    { headers: nicknameHeaders }
                );
                setNicknameSuccess = true;
            } catch (err) {
                attempts++;
                if (attempts >= 5) {
                    randomUsername = `User${Math.floor(100000 + Math.random() * 900000)}`;
                    try {
                        await axios.post(
                            `https://api.zoro.org/user/set-nickname?nickname=${randomUsername}`,
                            null,
                            { headers: nicknameHeaders }
                        );
                        setNicknameSuccess = true;
                    } catch (e) {
                        console.error('Failed to set nickname after several attempts.');
                        randomUsername = '[no nickname]';
                    }
                }
            }
        }

        return {
            address,
            privateKey,
            username: randomUsername,
            accessToken: access_token,
            message,
            signature
        };
    } catch (error) {
        console.error('Error creating wallet:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        return null;
    }
}

function logSuccess(message) {
    console.log(chalk.green('✓ ' + message));
}

function logError(message) {
    console.log(chalk.red('✗ ' + message));
}

function logWarning(message) {
    console.log(chalk.hex('#FFA500')('⚠ ' + message));
}

function logSection(title) {
    const line = '='.repeat(50);
    console.log(`\n${chalk.dim(line)}`);
    console.log(chalk.bold.cyan(` ${title.toUpperCase()}`));
    console.log(`${chalk.dim(line)}`);
}

function logSub(title) {
    console.log(chalk.blue(`\n→ ${title}`));
}

async function claimDailyReward(accessToken) {
    try {
        const response = await axios.post(
            "https://api.zoro.org/daily-rewards/claim",
            null,
            {
                headers: {
                    ...defaultHeaders,
                    "authorization": `Bearer ${accessToken}`
                }
            }
        );
        return response.data;
    } catch (error) {
        logError(`Failed to claim daily reward: ${error.message}`);
        return null;
    }
}

async function claimMissionReward(accessToken, rewardId) {
    try {
        const response = await axios.post(
            `https://api.zoro.org/mission-reward/${rewardId}`,
            null,
            {
                headers: {
                    ...defaultHeaders,
                    "authorization": `Bearer ${accessToken}`
                }
            }
        );
        console.log(`Mission reward ${rewardId} claimed successfully`);
        return response.data;
    } catch (error) {
        console.error(`Error claiming mission reward ${rewardId}:`, error.message);
        return null;
    }
}

async function completeImageMission(accessToken, missionType, missionId) {
    try {
        const imageUrl = imageUrls[missionType];
        
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: `${missionType}.jpg`,
            contentType: 'image/jpeg'
        });

        const response = await axios.post(
            `https://api.zoro.org/mission-activity/${missionId}`,
            form,
            {
                headers: {
                    ...defaultHeaders,
                    "authorization": `Bearer ${accessToken}`,
                    "content-type": `multipart/form-data; boundary=${form._boundary}`
                }
            }
        );
        console.log(`Mission ${missionType} completed successfully`);
        return response.data;
    } catch (error) {
        console.error(`Error completing ${missionType} mission:`, error.message);
        return null;
    }
}

async function getAccountInfo(accessToken) {
    try {
        const response = await axios.get(
            "https://api.zoro.org/scoreboard/me",
            {
                headers: {
                    ...defaultHeaders,
                    "authorization": `Bearer ${accessToken}`
                }
            }
        );
        const nickname = response.data.user.nickname;
        const { balance, rank } = response.data;
        console.log('Account Info:');
        console.log(`Nickname: ${nickname}`);
        console.log(`Balance: ${balance}`);
        console.log(`Rank: ${rank}`);
        return { nickname, balance, rank };
    } catch (error) {
        console.error('Error fetching account info:', error.message);
        return null;
    }
}

async function createAndProcessWallet(walletNumber, totalWallets) {
    logSection(`WALLET ${walletNumber}/${totalWallets}`);
    const walletData = await createWallet();
    if (!walletData) {
        logError('Failed to create wallet');
        return null;
    }

    logSub('Wallet Created');
    logSuccess(`Address : ${walletData.address}`);
    logSuccess(`Username: ${walletData.username}`);

    logSub('Claim Daily Reward');
    const dailyReward = await claimDailyReward(walletData.accessToken);
    if (dailyReward) logSuccess('Daily reward claimed');
    
    for (const [missionType, missionId] of Object.entries(imageMissions)) {
        logSub(`Mission: ${missionType}`);
        const missionResult = await completeImageMission(walletData.accessToken, missionType, missionId);
        if (missionResult) {
            logSuccess(`${missionType} mission completed`);
        } else {
            logError(`${missionType} mission failed`);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    for (const rewardId of missionRewardIds) {
        logSub(`Claim Mission Reward`);
        const rewardResult = await claimMissionReward(walletData.accessToken, rewardId);
        if (rewardResult) {
            logSuccess(`Mission reward claimed`);
        } else {
            logError(`Failed to claim mission reward`);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    logSub('Account Info');
    await getAccountInfo(walletData.accessToken);

    return walletData;
}

async function main(count) {
    console.clear();
    logSection('ZORO WALLET GENERATOR');
    console.log(chalk.cyan('\nCreated by: ') + chalk.white.bold('Elaine Seraphina'));
    console.log(chalk.dim('==========================================\n'));
    
    const wallets = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const walletFile = `wallet-${timestamp}.json`;
    
    for (let i = 0; i < count; i++) {
        const walletData = await createAndProcessWallet(i + 1, count);
        if (walletData) {
            wallets.push(walletData);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); 
    }

    fs.writeFileSync(walletFile, JSON.stringify(wallets, null, 2));
    logSection('COMPLETED');
    logSuccess(`${wallets.length} wallets created and saved to ${walletFile}`);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('How many wallets do you want to create? ', async (answer) => {
    const count = parseInt(answer);
    if (isNaN(count) || count <= 0) {
        console.log('Please enter a valid number');
    } else {
        await main(count);
    }
    rl.close();
});
