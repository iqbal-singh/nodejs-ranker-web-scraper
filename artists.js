
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const util = require('util');
const request = require('request');

const selectedArtists = process.argv.slice(2);
const chartLimit = 25;

const transport = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'xxxxxxxxxxxxxxxxx@gmail.com', // sender email username
        pass: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx' // sender email password
    }
}

const emailSender = '" Test Email <youngboy@nba.com>';
const emailRecipient = 'xxxxxxxxxxxxxxxxxxxxxxxxxx@gmail.com';

if (!selectedArtists.length) {
    console.log('No artist(s) were entered.');
}
else {
    getRankerHTML()
        .then(HTML => getSongsForArtists(HTML, chartLimit, selectedArtists))
        .then(songs => {
            if (songs.length) {
                return sendEmail(transport, emailSender, emailRecipient, selectedArtists, songs);
            }
            else {
                return `0 songs found for artist(s): ${selectedArtists}. No email was sent.`;
            }
        })
        .then(emailInfo => {
            if (emailInfo.accepted) {
                console.log(`Email sent to [${emailInfo.accepted}] for [${getFormattedList([...selectedArtists])}]`);
            }
            else {
                console.log(emailInfo);
            }
        })
        .catch(e => console.log('Error', e));
}

async function getRankerHTML() {
    requestPromise = util.promisify(request);
    try {
        let data = await requestPromise('https://www.ranker.com/list/best-rap-songs-2019/ranker-music');
        if (data.statusCode === 200) {
            return data.body;
        }
    }
    catch (err) {
        console.log(err);
    }
}

function getSongsForArtists(parsedHTML, limit, specifiedArtists) {
    let $ = cheerio.load(parsedHTML);
    let artists = $('.listItem__properties').map((i, el) => $(el).text().split(', ').join(' Featuring '));
    let songTitles = $('.listItem__title').map((i, el) => $(el).text());
    let res = [];

    for (let i = 0; i <= limit - 1; i++) { // top 25 songs
        for (let j = 0; j < specifiedArtists.length; j++) {
            if (artists[i].includes(specifiedArtists[j])) {
                res.push({ artist: artists[i], song: songTitles[i] });
            }
        }
    }
    return res;
}

async function sendEmail(transport, from, to, selectedArtists, songs) {
    let transporter = nodemailer.createTransport(transport);
    let info = await transporter.sendMail({
        from: from,
        to: to,
        subject: `Your ${selectedArtists.length === 1 ? 'artist is' : 'artists are'}: ${getFormattedList([...selectedArtists])}`,
        html: `${getSongsAsFormattedHTML(songs)}`
    });

    return info;
}

function getFormattedList(arr) {
    if (arr.length === 1) {
        return arr.toString();
    }
    else
        if (arr.length === 2) {
            return arr.join(' and ');
        }
        else {
            let last = arr.pop();
            return `${arr.join(', ')}, and ${last}`;
        }
}

function getSongsAsFormattedHTML(songs) {
    return songs.map(s => `<b>${s.artist}</b>: <i>${s.song}</i>`).join('<br>');
}