import 'dotenv/config';

export const PORT = process.env.PORT || 3000

export const wooCommerceApi = {
    url: process.env.WOOCOMMERCE_URL,
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY,
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET,
    version: process.env.WOOCOMMERCE_VERSION
};

export const WordPressApi = {
    user: process.env.WORDPRESS_USERNAME,
    password: process.env.WORDPRESS_PASSWORD
};