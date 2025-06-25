import { useState, useEffect } from 'react';
import { Heart, Search, X, Pen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllItems } from '../services/closetApi';
import { deleteItem} from '../services/closetApi';




type Item = {
  id: number;
  name: string;
  image: string;
  favorite: boolean;
  category: string;
  tab?: 'items' | 'outfits';
};

type TabType = 'items' | 'outfits' | 'favourites';

// Mock data for outfits
const mockOutfits: Item[] = [
  { id: 3, name: 'Party Look', image: '/images/image3.jpg', favorite: false, category: 'Party' },
  { id: 4, name: 'Casual Look', image: '/images/image4.jpg', favorite: false, category: 'Casual' },
  { id: 5, name: 'Sporty Look', image: '/images/image5.jpg', favorite: false, category: 'Sporty' },
  { id: 6, name: 'Party Look', image: '/images/image6.jpg', favorite: false, category: 'Party' },
];

// Start with an empty favourites array; items will be added dynamically
const mockFavourites: Item[] = [];

const ClosetPage = () => {

  
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Item[]>(mockOutfits);
  const [favourites, setFavourites] = useState<Item[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ id: number; tab: TabType; name: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Fetch items from backend
useEffect(() => {
  const fetchItems = async () => {
    try {
      const res = await fetchAllItems();
      const formattedItems: Item[] = res.data.map((item: any) => ({
        id: item.id,
        name: item.category, // or item.name if available
        image: `http://localhost:5001${item.imageUrl}`, 
        favorite: false,
        category: item.category,
      }));

      setItems(formattedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  fetchItems();
}, []);


  // Load favourites from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const storedFavs = localStorage.getItem(`closet-favs-${token}`);
    if (storedFavs) {
      const parsedFavs: Item[] = JSON.parse(storedFavs);
      setFavourites(parsedFavs);
      setItems(prev =>
        prev.map(item => ({
          ...item,
          favorite: parsedFavs.some(fav => fav.id === item.id && fav.tab === 'items'),
        }))
      );
      setOutfits(prev =>
        prev.map(item => ({
          ...item,
          favorite: parsedFavs.some(fav => fav.id === item.id && fav.tab === 'outfits'),
        }))
      );
    }
  }, []);

  const toggleFavorite = (item: Item, tab: 'items' | 'outfits') => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const isFav = favourites.some(fav => fav.id === item.id && fav.tab === tab);
    const updatedFavs = isFav
      ? favourites.filter(fav => !(fav.id === item.id && fav.tab === tab))
      : [...favourites, { ...item, favorite: true, tab }];

    setFavourites(updatedFavs);
    localStorage.setItem(`closet-favs-${token}`, JSON.stringify(updatedFavs));

    const toggleList = (list: Item[], setter: (v: Item[]) => void) =>
      setter(list.map(el => (el.id === item.id ? { ...el, favorite: !el.favorite } : el)));

    tab === 'items' ? toggleList(items, setItems) : toggleList(outfits, setOutfits);
  };

  const handleRemoveClick = (id: number, tab: TabType, name: string) => {
    setItemToRemove({ id, tab, name });
    setShowModal(true);
  };

  // const confirmRemove = () => {
  //   if (itemToRemove) {
  //     const { id, tab } = itemToRemove;
  //     const filterFn = (arr: Item[]) => arr.filter(it => it.id !== id);
  //     tab === 'items'
  //       ? setItems(filterFn(items))
  //       : tab === 'outfits'
  //       ? setOutfits(filterFn(outfits))
  //       : setFavourites(filterFn(favourites));
  //   }
  //   setShowModal(false);
  // };

  const confirmRemove = async () => {
  if (itemToRemove) {
    const { id, tab } = itemToRemove;

    try {
      await deleteItem(id.toString());
      // only remove from UI if the API call succeeded
      const filterFn = (arr: Item[]) => arr.filter(it => it.id !== id);
      if (tab === 'items') setItems(filterFn(items));
      else if (tab === 'outfits') setOutfits(filterFn(outfits));
      else setFavourites(filterFn(favourites));
    } catch (err) {
      console.error('Failed to delete item:', err);
      // optionally show an error toast/modal
    }
  }
  setShowModal(false);
};

  const cancelRemove = () => {
    setShowModal(false);
    setItemToRemove(null);
  };

  const getCurrentData = () => {
    const data = activeTab === 'items' ? items : activeTab === 'outfits' ? outfits : favourites;
    return data.filter(
      item =>
        (!activeCategory || item.category === activeCategory) &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getTabCategories = () =>
    Array.from(
      new Set(
        (activeTab === 'items' ? items : activeTab === 'outfits' ? outfits : favourites).map(i => i.category)
      )
    );

  return (

        <div className="w-full max-w-screen-sm mx-auto px-2 sm:px-4">
    {/* Header Image Section */}
    <div 
   className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-64 mb-6"
      style={{
        backgroundImage: `url(/header.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 1,
          marginLeft: 'calc(-50vw + 50%)', // This centers the full-width element
        width: '100vw',
         marginTop: '-1rem'
      }}
    >
<div className="px-6 py-2 border-2 border-white z-10">
  <h1 
    className="text-2xl font-bodoni font-light text-center text-white"
    style={{
     // fontFamily: "'Bodoni Moda', serif",
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
    }}
  >
    MY CLOSET
  </h1>
</div>


      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
    </div>


{/* Category Filters */}
<div className="flex flex-wrap justify-center gap-3 mb-6">
  {['All', ...getTabCategories()].map((category, index) => {
    const isActive = activeCategory === category || (category === 'All' && activeCategory === null);
    return (
      <button
        key={index}
        onClick={() => setActiveCategory(category === 'All' ? null : category)}
        className={`px-4 py-1 border border-black rounded-full text-sm font-medium transition-colors duration-200
          ${isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}`}
      >
        {category} {/* This was missing - add the category text here */}
      </button>
    );
  })}
</div>

      {/* Search Bar */}
<div className="relative mb-6">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-4 w-4" />
  <input
    type="search"
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    className="pl-10 pr-4 py-2 bg-white text-black border border-black rounded-full w-full focus:outline-none focus:ring-2 focus:ring-black"
    placeholder="Search items..."
  />
</div>

      {/* Tabs */}
      <div className="flex justify-center mb-6 gap-8">
        {(['items', 'outfits', 'favourites'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full font-medium transition ${
              activeTab === tab ? 'bg-black text-white' : 'bg-white text-black border border-black'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
{/* Grid */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
  {getCurrentData().map(item => (
    <div key={item.id} className="relative h-[200px] sm:h-[250px] md:h-[280px]">

      <div className="bg-gray-200 w-full h-full rounded-lg overflow-hidden flex flex-col text-xs sm:text-sm">
        <div className="flex-grow relative">
<img
  src={item.image}
  alt={item.name}
  onClick={() => setPreviewImage(item.image)}
  className="absolute inset-0 w-full h-full object-contain cursor-pointer bg-white"
/>
          <button
            onClick={() => {/* TODO: handleEditClick(item.id) */}}
            className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-white rounded-full p-1 shadow z-10"
          >
            <Pen className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
          </button>
          
          <button
            onClick={() => handleRemoveClick(item.id, activeTab, item.name)}
            className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white rounded-full p-1 shadow z-10"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center justify-between px-2 py-1 sm:p-2 bg-white">
          <span className="text-gray-700 truncate">{item.name}</span>
          <button
            onClick={() =>
              toggleFavorite(
                item,
                activeTab === 'favourites'
                  ? (favourites.find(f => f.id === item.id)?.tab as 'items' | 'outfits')
                  : (activeTab as 'items' | 'outfits')
              )
            }
            className="focus:outline-none"
          >
            <Heart
              className={`h-4 w-4 sm:h-5 sm:w-5 ${
                favourites.some(f => f.id === item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  ))}
</div>


      {/* Modals */}
      <AnimatePresence>
        {showModal && itemToRemove && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg p-6 shadow-lg w-80"
            >
              <h2 className="text-lg font-semibold mb-4">Remove {itemToRemove.name}?</h2>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelRemove}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemove}
                  className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <motion.img src={previewImage} alt="Preview" className="w-4/5 h-4/5 object-contain" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-2 right-2 text-white bg-gray-800 bg-opacity-50 rounded-full p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClosetPage;
