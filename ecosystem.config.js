// module.exports = {
//   apps : [{
//     name   : "app1",
//     script : "./app.js"
//   }]
// }

module.exports = {
  apps: [
    {
      name: "emoh-app", // Change this to your app name
      script: "dist/main.js", // Entry point of your compiled NestJS app
      // instances: "max", // Run as many instances as CPU cores
      // exec_mode: "cluster", // Run in cluster mode for better performance
      watch: true, // Auto-restart on changes
    },
  ],
};
