module.exports = async function (context, req) {
    context.log('Health check v3 triggered');
    
    context.res = {
        status: 200,
        body: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            message: 'v3 programming model health check'
        }
    };
};
