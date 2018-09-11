"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToMediaPosts = (mediaArray) => {
    const posts = [];
    mediaArray.forEach(media => {
        const node = media['node'];
        posts.push({
            id: node['id'],
            caption: node['edge_media_to_caption'],
            ownerId: node['owner']['id'],
            likes: Number(node['edge_liked_by']['count']) || 0,
            comments: Number(node['edge_media_to_comment']['count']) || 0,
            createdAt: new Date(Number(node['taken_at_timestamp']) * 1000) ||
                new Date(Date.now()),
            commentsDisabled: Boolean(node['comments_disabled']) || false,
            shortcode: node['shortcode'] || null,
        });
    });
    return posts;
};
//# sourceMappingURL=post.js.map