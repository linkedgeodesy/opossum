var path = require('path')
var webpack = require("webpack")

module.exports = {
    entry: ['./src/app.js'],

    // path of the resulting bundled file
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js'
    },

    devServer: {
        contentBase: path.join(__dirname, "dist"),
        compress: true,
        port: 9000
    },

    module: {
        // Loaders allow you to preprocess files as you require() or “load” them.
    loaders: [

        { loader: 'babel-loader',

            // Skip any files outside of your project's `src` directory
            include: path.join(__dirname, 'src'),

            // Only run `.js`
            test: /\.js?$/,

            // Options to configure babel with
            // alternatively you could create a .babelrc file
            query: {
                // plugins: ['transform-runtime'],
                presets: ['es2015']
            }
        }
        ],

        rules: [
        {
            test: /\.css$/,
            use: [{
                    loader: "style-loader"
                },
                {
                    loader: "css-loader"
                }]
        }]
    },

    plugins: [
        // makes jquery globally available for legacy libraries that depend on it being available globally
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        })
    ]

}
