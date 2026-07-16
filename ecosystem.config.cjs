module.exports = {
  apps: [
    {
      name: 'word-wars-authority',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 2567,
      },
    },
  ],
};
