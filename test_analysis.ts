import axios from 'axios';

async function test() {
    const url = 'http://localhost:3000/api/analyze-url';
    const videoUrl = 'https://www.youtube.com/watch?v=uqPje7w-7RI';

    console.log(`Testing analysis for: ${videoUrl}`);

    try {
        const response = await axios.post(url, {
            videoUrl: videoUrl,
            textContext: "Analyze this video",
            analysisLabel: "General Analysis"
        });

        console.log('Analysis Success!');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error('Analysis Failed:', error.response?.data || error.message);
    }
}

test();
