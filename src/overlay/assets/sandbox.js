window.addEventListener('message', async (event) => {
    const { action, id, blob, toType } = event.data;
    if (action === 'convert') {
        try {
            const resultBlob = await heic2any({ blob, toType: toType || 'image/jpeg' });
            event.source.postMessage({ 
                action: 'convert-result', 
                id, 
                success: true, 
                result: resultBlob 
            }, '*');
        } catch (error) {
            event.source.postMessage({ 
                action: 'convert-result', 
                id, 
                success: false, 
                error: error.message 
            }, '*');
        }
    }
});
