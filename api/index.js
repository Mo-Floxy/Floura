let appPromise;

module.exports = async (req, res) => {
  appPromise ||= import('../server/src/app.js').then((module) => module.default);
  const app = await appPromise;
  return app(req, res);
};
