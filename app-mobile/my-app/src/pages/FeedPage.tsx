import { Heart } from "lucide-react";
import { useState } from "react";
import Footer from '../components/Footer';


interface Post {
  id: number;
  username: string;
  avatar: string;
  content: string;
  likes: number;
  liked: boolean;
  date: string;
}

const initialPosts: Post[] = [
  {
    id: 1,
    username: "fashionista",
    avatar: "F",
    content: "My outfit of the day for this sunny weather! #OOTD #Summer",
    likes: 24,
    liked: false,
    date: "2 hours ago"
  },
  {
    id: 2,
    username: "style_guru",
    avatar: "S",
    content: "Perfect layers for today's unpredictable weather. What's everyone wearing for the rain forecast?",
    likes: 18,
    liked: false,
    date: "5 hours ago"
  },
  {
    id: 3,
    username: "trendsetter",
    avatar: "T",
    content: "Just added some new fall items to my closet! Can't wait for cooler weather to wear these.",
    likes: 42,
    liked: false,
    date: "1 day ago"
  }
];

const FeedPage = () => {
  const [posts, setPosts] = useState(initialPosts);
  
  const toggleLike = (id: number) => {
    setPosts(posts.map(post => {
      if (post.id === id) {
        return {
          ...post,
          likes: post.liked ? post.likes - 1 : post.likes + 1,
          liked: !post.liked
        };
      }
      return post;
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-center" style={{ fontFamily: "'Bodoni Moda', serif" }}>Feed</h1>
      
      <div className="space-y-8">
        {posts.map(post => (
          <div key={post.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                <img
                  src={`/avatars/${post.id}.png`}
                  alt={post.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"; // Hide image on error
                    e.currentTarget.nextSibling!.textContent = post.avatar; // Show fallback
                  }}
                />
                <span className="text-sm text-gray-700">{post.avatar}</span>
              </div>
              <div>
                <div className="font-medium">@{post.username}</div>
                <div className="text-sm text-gray-500">{post.date}</div>
              </div>
            </div>
            
            <div className="mb-4">
              <p>{post.content}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="bg-gray-200 h-40 w-full rounded-md flex items-center justify-center text-gray-400">
                [Outfit Image]
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <button
                onClick={() => toggleLike(post.id)}
                className="flex items-center space-x-1 focus:outline-none"
              >
                <Heart 
                  className={`h-5 w-5 transition-colors ${post.liked ? "fill-red-500 text-red-500" : "text-gray-400"}`}
                />
                <span className="text-sm text-gray-500">{post.likes} likes</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
 
  );
};

export default FeedPage;