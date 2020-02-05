export interface MediaPostOptions {
  /**
   * maxLikesToLikeMedia, maximum likes a post is allowed to have to be liked by the bot
   * */
  maxLikesToLikeMedia?: number;

  /**
   * minLikesToLikeMedia, minimum likes a post is allowed to have to be liked by the bot
   * */
  minLikesToLikeMedia?: number;
}

export interface IMediaPost {
  id: string;
  likes: number;
  caption: string;
  comments: number;
  createdAt: Date;
  ownerId: string;
  commentsDisabled: boolean;
  shortcode: string;
  likedByUser?: boolean;
}

export class MediaPost implements IMediaPost {
  public id: string;
  public likes: number = 0;
  public caption: string;
  public comments: number = 0;
  public createdAt: Date;
  public ownerId: string;
  public commentsDisabled: boolean;
  public shortcode: string;
  public options: MediaPostOptions = {
    maxLikesToLikeMedia: 100,
    minLikesToLikeMedia: 0,
  };
  public likedByUser?: boolean = false;

  constructor(mediaPostData: IMediaPost, options?: MediaPostOptions) {
    if (mediaPostData && Object.keys(mediaPostData).length > 0) {
      Object.keys(mediaPostData).forEach(key => {
        this[key] = mediaPostData[key];
        /*if (Object.keys(this).indexOf(key) > 0) {
          // key exists
          this[key] = mediaPostData[key];
        }*/
      });
    }
    this.options = {
      ...this.options,
      ...options
    };

  }

  public canLike(): boolean {
    return (
      this.likes < this.options.maxLikesToLikeMedia &&
      this.likes > this.options.minLikesToLikeMedia &&
      this.likedByUser === false
    );
  }
}

export const convertToMediaPosts = (
  mediaArray: any[],
  options?: MediaPostOptions,
): MediaPost[] => {
  const posts: MediaPost[] = [];
  mediaArray.forEach(media => {
    const node = media['node'];
    posts.push(
      new MediaPost(
        {
          id: node['id'],
          caption: node['edge_media_to_caption'],
          ownerId: node['owner']['id'],
          likes: Number(node['edge_liked_by']['count']) || 0,
          comments: Number(node['edge_media_to_comment']['count']) || 0,
          createdAt:
            new Date(Number(node['taken_at_timestamp']) * 1000) ||
            new Date(Date.now()),
          commentsDisabled: Boolean(node['comments_disabled']) || false,
          shortcode: node['shortcode'] || null,
        },
        options,
      ),
    );
  });

  return posts;
};

export const convertToMediaPost = (
  mediaData: object,
  options?: MediaPostOptions,
): MediaPost => {
  try {
    return new MediaPost(
      {
        id: mediaData['id'],
        ownerId: mediaData['owner']['id'],
        caption:
          mediaData['edge_media_to_caption']['edges'][0]['node']['text'] || '',
        /*likes: Number(mediaData['edge_media_preview_like']['count']) || 0,
        comments: Number(mediaData['edge_media_to_comment']['count']) || 0,*/
        likes: mediaData && mediaData['edge_media_preview_like'] && mediaData['edge_media_preview_like']['count'] || 0,
        comments: mediaData && mediaData['edge_media_to_comment'] && mediaData['edge_media_to_comment']['count'] || 0,
        createdAt:
          new Date(Number(mediaData['taken_at_timestamp']) * 1000) ||
          new Date(Date.now()),
        commentsDisabled: Boolean(mediaData['comments_disabled']) || false,
        shortcode: mediaData['shortcode'] || null,
        likedByUser: Boolean(mediaData['viewer_has_liked']) || false,
      },
      options,
    );
  } catch (err) {
    console.error('convertToMediaPost', err);
    return null;
  }
};
