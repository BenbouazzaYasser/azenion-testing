module.exports = function (api) {
  api.cache(true);
  // Jest sets NODE_ENV=test. Force CJS modules only there; Metro/Expo
  // builds keep the preset defaults untouched.
  const isTest = process.env.NODE_ENV === "test" || process.env.BABEL_ENV === "test";
  return {
    presets: ["babel-preset-expo"],
    plugins: isTest ? ["@babel/plugin-transform-modules-commonjs"] : [],
  };
};
