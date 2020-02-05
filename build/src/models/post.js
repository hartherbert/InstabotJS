"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MediaPost {
    constructor(mediaPostData, options) {
        this.likes = 0;
        this.comments = 0;
        this.options = {
            maxLikesToLikeMedia: 100,
            minLikesToLikeMedia: 0,
        };
        this.likedByUser = false;
        if (mediaPostData && Object.keys(mediaPostData).length > 0) {
            Object.keys(mediaPostData).forEach(key => {
                this[key] = mediaPostData[key];
            });
        }
        this.options = Object.assign({}, this.options, options);
    }
    canLike() {
        return (this.likes < this.options.maxLikesToLikeMedia &&
            this.likes > this.options.minLikesToLikeMedia &&
            this.likedByUser === false);
    }
}
exports.MediaPost = MediaPost;
exports.convertToMediaPosts = (mediaArray, options) => {
    const posts = [];
    mediaArray.forEach(media => {
        const node = media['node'];
        posts.push(new MediaPost({
            id: node['id'],
            caption: node['edge_media_to_caption'],
            ownerId: node['owner']['id'],
            likes: Number(node['edge_liked_by']['count']) || 0,
            comments: Number(node['edge_media_to_comment']['count']) || 0,
            createdAt: new Date(Number(node['taken_at_timestamp']) * 1000) ||
                new Date(Date.now()),
            commentsDisabled: Boolean(node['comments_disabled']) || false,
            shortcode: node['shortcode'] || null,
        }, options));
    });
    return posts;
};
exports.convertToMediaPost = (mediaData, options) => {
    try {
        return new MediaPost({
            id: mediaData['id'],
            ownerId: mediaData['owner']['id'],
            caption: mediaData['edge_media_to_caption']['edges'][0]['node']['text'] || '',
            likes: mediaData && mediaData['edge_media_preview_like'] && mediaData['edge_media_preview_like']['count'] || 0,
            comments: mediaData && mediaData['edge_media_to_comment'] && mediaData['edge_media_to_comment']['count'] || 0,
            createdAt: new Date(Number(mediaData['taken_at_timestamp']) * 1000) ||
                new Date(Date.now()),
            commentsDisabled: Boolean(mediaData['comments_disabled']) || false,
            shortcode: mediaData['shortcode'] || null,
            likedByUser: Boolean(mediaData['viewer_has_liked']) || false,
        }, options);
    }
    catch (err) {
        console.error('convertToMediaPost', err);
        return null;
    }
};
