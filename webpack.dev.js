const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: ['@babel/polyfill', './src/index.js'],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 3000
  },
  watch: true,
  devtool: 'eval-source-map',
  mode: 'development',
  watchOptions: {
    ignored: /node_modules/,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: [/\.css$/],
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader',
            options: {
              url: true,
            },
          },
        ],
      },
      {
        test: [/\.scss$/],
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader',
            options: {
              url: true,
              modules: true,
              localIdentName: '[folder]-[local]-[hash:base64:8]',
            },
          },
          'sass-loader',
        ],
      },
      {
        test: /\.(png|jpg|gif|ttf|svg|eot|woff2|woff)$/,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src/index.html'),
      filename: 'index.html',
      inject: 'body',
    }),
    new CopyWebpackPlugin([
      { from: 'src/img' },
      { from: 'src/rootfiles' },
    ]),
  ]
};