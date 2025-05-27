import { Heart } from "lucide-react";
import { useState } from "react";

interface Post {
  id: number;
  username: string;
  avatar: string;
  content: string;
  likes: number;
  liked: boolean;
  date: string;
}

interface Account {
  id: number;
  username: string;
  avatar: string;
}

const initialPosts: Post[] = [
  {
    id: 1,
    username: "fashionista",
    avatar: "F",
    content: "My outfit of the day for this sunny weather! #OOTD #Summer",
    likes: 24,
    liked: false,
    date: "2 hours ago",
  },
  {
    id: 2,
    username: "style_guru",
    avatar: "S",
    content:
      "Perfect layers for today's unpredictable weather. What's everyone wearing for the rain forecast?",
    likes: 18,
    liked: false,
    date: "5 hours ago",
  },
  {
    id: 3,
    username: "trendsetter",
    avatar: "T",
    content:
      "Just added some new fall items to my closet! Can't wait for cooler weather to wear these.",
    likes: 42,
    liked: false,
    date: "1 day ago",
  },
];

const recommendedAccounts: Account[] = [
  { id: 101, username: "chicdaily", avatar: "C" },
  { id: 102, username: "urbanlook", avatar: "U" },
  { id: 103, username: "closetqueen", avatar: "Q" },
];

// ...imports stay the same

const FeedPage = () => {
  const [posts, setPosts] = useState(initialPosts);

  const toggleLike = (id: number) => {
    setPosts(
      posts.map((post) => {
        if (post.id === id) {
          return {
            ...post,
            likes: post.liked ? post.likes - 1 : post.likes + 1,
            liked: !post.liked,
          };
        }
        return post;
      })
    );
  };

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-10">
      {/* Spacer on left for centering */}
      <div className="hidden md:block w-4"></div>

      {/* Feed Section */}
      <div className="w-full md:w-[58%]">
        {/* <h1 className="text-3xl md:text-4xl font-bodoni tracking-wide mb-6 text-center md:text-left">
          Your Feed
        </h1> */}

        <div className="space-y-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-3xl p-5 shadow-md border border-black"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-700 font-semibold relative">
                  <img
                    src={`/avatars/${post.id}.png`}
                    alt={post.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextSibling!.textContent = post.avatar;
                    }}
                  />
                  <span className="absolute">{post.avatar}</span>
                </div>
                <div>
                  <div className="font-medium text-sm">@{post.username}</div>
                  <div className="text-xs text-gray-500">{post.date}</div>
                </div>
              </div>

              <p className="text-sm text-gray-800 mb-3">{post.content}</p>

              <div className="rounded-xl overflow-hidden bg-gray-100 h-[400px] flex items-center justify-center text-gray-400">
                [Outfit Image]
              </div>

              <div className="mt-3 flex items-center">
                <button
                  onClick={() => toggleLike(post.id)}
                  className="flex items-center space-x-1 focus:outline-none"
                >
                  <Heart
                    className={`h-5 w-5 transition-colors ${
                      post.liked
                        ? "fill-red-500 text-red-500"
                        : "text-gray-400"
                    }`}
                  />
                  <span className="text-sm text-gray-500">
                    {post.likes} likes
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-[32%]">
        <h2 className="text-xl font-livvic mb-4">Recommended Accounts</h2>
        <div className="space-y-5">
          {recommendedAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-3xl p-4 shadow-md border border-black flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold relative overflow-hidden">
                <img
                  src={`/avatars/${account.id}.png`}
                  alt={account.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling!.textContent = account.avatar;
                  }}
                />
                <span className="absolute">{account.avatar}</span>
              </div>
              <div className="text-sm font-medium">@{account.username}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedPage;


