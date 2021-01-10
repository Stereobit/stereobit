const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const autoprefixer = require('autoprefixer');

module.exports = {
  entry: ["@babel/polyfill", "./src/index.js"],
  output: {
    filename: "[contenthash].[name].js",
    sourceMapFilename: "[contenthash].[name].js.map",
    publicPath: "/",
    path: path.resolve(__dirname, "build"),
  },
  devtool: "source-map",
  mode: "production",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: [/\.css$/],
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  autoprefixer({
                    grid: true,
                  }),
                ],
              },
            },
          },
        ],
      },
      {
        test: [/\.scss$/],
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  autoprefixer({
                    grid: true,
                  }),
                ],
              },
            },
          },
          "sass-loader",
        ],
      },
      {
        test: /\.(png|jpg|gif|ttf|svg|eot|woff2|woff)$/,
        use: [
          {
            loader: "file-loader",
          },
        ],
      },
    ],
  },
  plugins: [
    new CompressionPlugin({
      algorithm: "gzip",
      test: /\.js$|\.css$|\.html$/,
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src/index.html"),
      filename: "index.html",
      inject: "body",
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src/404.html"),
      filename: "404.html",
      inject: "body",
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "src/rootfiles" }],
    }),
    new webpack.DefinePlugin({
      "process.env": Object.assign({
        NODE_ENV: JSON.stringify("production"),
      }),
    }),
    new MiniCssExtractPlugin({
      filename: "[contenthash].[name].css",
    }),
  ],
};
