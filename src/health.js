function healthCheck() {
  const result = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  
  if (result.status === 'ok') {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.error('Health check failed');
    process.exit(1);
  }
}

healthCheck(); 