const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OpenAI } = require('openai');
//const fs = require("fs/promises");
const { transparentBackground } = require("transparent-background");

const app = express();
app.use(cors());
const apiKey = process.env.AI_API_KEY;


const openai = new OpenAI({
    apiKey: apiKey,
  });


app.get('/getGameContext', async (req, res) => {
    const environment = req.query.environment; // Ta emot miljön som en query parameter

    try {
        const prompt = `Skapa data för ett spel. Givet en miljö "${environment}", beskriv följande:
        
        1. Enemy: En karaktär som är en fiende i denna miljö. Beskriv kortfattat. Endast några ord. Vad det är och egenskaper. Exempel: "Tiger, farlig och listig"
        2. Hero: En karaktär som är en hjälte i denna miljö. Beskriv kortfattat. Endast några ord. Vad det är och egenskaper. Exempel: "Papegoja, smart och pratglad"
        3. Victim: En karaktär som är ett offer i denna miljö. Beskriv kortfattat. Endast några ord. Vad det är och egenskaper Exempel: "Hare, snabb men försiktig".
        4. IntroText: Text som ska visas innan spelet börjar. Den ska på ett engagerande sätt introducera spelet utifrån karaktärerna och miljön. Beskriv hur spelaren
        ikläder sig rollen som hjälten för att beskydda offren från fienden. Få även in att man använder piltangenter för att styra.
        Svara i ett jsonformat enligt följande:
        {
            \"environment\": \"Rymden\",
            \"introText\": \"Som rymdforksare är det ditt ansvar att skydda de stackars ensamma och rädda austronauterna mot den sluga och skoningslösa rymdpiraden. Använd piltangenterna och låt spelet börja...\",
            \"Enemy\": \"Rymdpirat, slug och skoningslös\",
            \"Hero\": \"Rymdutforskare, modig och skicklig\",
            \"Victim\": \"Astronaut, ensam och rädd\"
        }`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            max_tokens: 200,
            messages: [
                { role: "system", content: "Detta är en konversation mellan en användare och en AI." },
                { role: "user", content: prompt }
            ]
        });

        const textResponse = response.choices[0].message.content.trim();
        console.log('response: ' + textResponse)
        //const parsedResponse = parseResponse(textResponse, environment);
        parsedResponse = extractAndParseJson(textResponse);
        //const parsedResponse = {introText:"Livliga träd och vild vilda djur.",Enemy:"Orm, giftig och snabb.",Hero:"Gorilla, stark och beskyddande.",Victim:"Fågel, sårbar och vacker."}

        res.send(parsedResponse);
    } catch (error) {
        console.error('Fel vid anrop till OpenAI:', error);
        res.status(500).send('Ett fel inträffade vid anrop till OpenAI');
    }
});




app.get('/getBackground', async (req, res) => {
    const environment = req.query.environment; // Ta emot miljön som en query parameter
    if (!environment) {
        return res.status(400).send('Environment parameter is required');
    }

    try {

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `Skapa en färgglad miljöbild i pixelart-stil till ett spel. Miljön ska vara: ${environment}. I främre delen av bilden ska finnas yta att stå på. Bakgre delen ska innehålla detaljer utifrån miljön. Fyll ut hela bilden.`,
            n: 1,
            size: "1792x1024"
          });

                // Hämta bilden baserat på URL:en från OpenAI's svar (anpassa detta efter faktiskt svar)
                const imageUrl = response.data[0].url; // Antagande: svaret innehåller en bild-URL
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        
                // Sätt rätt innehållstyp för bilden
                res.setHeader('Content-Type', 'image/png'); // Antagande: bilden är i PNG-format
        
                // Skicka bildens innehåll som respons
                res.send(imageResponse.data);
    } catch (error) {
        console.error('Failed to generate image:', error);
        res.status(500).send('Failed to generate image');
    }
});

app.get('/getSprite', async (req, res) => {
    const description = req.query.description; // Ta emot beskrivningen som en query parameter
    if (!description) {
        return res.status(400).send('description parameter is required');
    }

    try {

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `Skapa en färgglad sprite till ett spel i pixelart-stil. Det ska vara:  ${description} .Det ska bara vara en tydlig karaktär i helfigur. Inga övriga objekt. Bakgrunden ska vara enfärgad`,
            n: 1,
            size: "1024x1024"
          });

                // Hämta bilden baserat på URL:en från OpenAI's svar
                const imageUrl = response.data[0].url; // Antagande: svaret innehåller en bild-URL
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

                //Ta bort backgrund
                const imageResponseNoBgr = await transparentBackground(imageResponse.data, "png", {
                    // uses a 1024x1024 model by default 
                    // enabling fast uses a 384x384 model instead
                    fast: false,
                });

                // Sätt rätt innehållstyp för bilden
                res.setHeader('Content-Type', 'image/png'); // Antagande: bilden är i PNG-format
        
                // Skicka bildens innehåll som respons
                res.send(imageResponseNoBgr)
                //res.send(imageResponse.data);
    } catch (error) {
        console.error('Failed to generate image:', error);
        res.status(500).send('Failed to generate image');
    }
});

function extractAndParseJson(inputString) {
    // Använd ett reguljärt uttryck för att matcha JSON-strukturen
    // Detta enkla exempel antar att JSON-strukturen startar med '{' och slutar med '}'
    // och inte innehåller några klammerparenteser '{' eller '}' i nycklar eller värden utanför andra objekt.
    const jsonPattern = /\{.*\}/s;
    const match = inputString.match(jsonPattern);

    if (match) {
        const jsonString = match[0];
        try {
            const jsonData = JSON.parse(jsonString);
            return jsonData;
        } catch (error) {
            console.error("Parsing error:", error);
            return null;
        }
    } else {
        console.error("Ingen JSON-struktur hittades");
        return null;
    }
}


const port = process.env.PORT || 3000; // Använd miljövariabeln PORT, eller 3000 om PORT inte är definierad
app.listen(port, () => console.log(`Server körs på port ${port}`));
//app.listen(3000, () => console.log('Server körs på port 3000'));
