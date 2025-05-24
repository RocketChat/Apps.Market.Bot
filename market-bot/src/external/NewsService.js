"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const REDDIT_NEWS_URL = 'https://www.reddit.com/r/stocks/new.json?limit=5';
class NewsService {
    static async getLatestNews(http) {
        const response = await http.get(REDDIT_NEWS_URL, {
            headers: { 'User-Agent': 'RocketChatBot/1.0' }
        });
        if (!response.data || !response.data.data || !response.data.data.children) {
            return [];
        }
        return response.data.data.children.map((child) => ({
            title: child.data.title,
            url: `https://reddit.com${child.data.permalink}`,
            sentiment: 'Neutral',
        }));
    }
}
exports.NewsService = NewsService;
