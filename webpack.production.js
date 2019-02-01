const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const autoprefixer = require('autoprefixer');

module.exports = {
  entry: ['@babel/polyfill', './src/index.js'],
  output: {
    filename: '[hash].[name].js',
    sourceMapFilename: '[hash].[name].js.map',
    publicPath: '/',
    path: path.resolve(__dirname, 'build'),
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 3000
  },
  devtool: 'source-map',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      }, {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      }, {
        test: [/\.css$/],
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader',
            options: {
              url: true,
            },
          },
          { loader: 'postcss-loader',
            options: {
              plugins: [
                autoprefixer({ grid: true, browsers: ['> 5%', 'IE >= 11', 'safari >= 8'] }),
              ],
            },
          },
        ],
      }, {
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
          { loader: 'postcss-loader',
            options: {
              plugins: [
                autoprefixer({ grid: true, browsers: ['> 5%', 'IE >= 11', 'safari >= 8'] }),
              ],
            },
          },
          'sass-loader',
        ],
      }, {
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
    new webpack.DefinePlugin({
      'process.env': Object.assign({
        'NODE_ENV': JSON.stringify('production'),
      }),
    }),
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|html)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
  ]
};
