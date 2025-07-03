import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Play, Calendar, MessageCircle, Music } from 'lucide-react';
import '../styles/ArtistPage.css';

// Mock API
const fetchArtistData = async (artistId) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const mockData = {
    '1': {
      artist: {
        id: '1',
        name: 'BTS',
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
        genres: ['K-pop', 'Pop', 'Hip Hop'],
        popularity: 95,
        followers: 74234156,
        bio: 'BTS is a seven-member South Korean boy band...',
        is_favorite: false,
        monthly_listeners: 47000000,
        verified: true
      },
      topTracks: [
        { id: 1, name: 'Dynamite', play_count: 1200000000, duration: '3:19' },
        { id: 2, name: 'Butter', play_count: 980000000, duration: '2:44' }
      ],
      albums: [
        { id: 1, name: 'Love Yourself', year: 2018, image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop' }
      ],
      comments: [
        { id: 1, username: 'army_forever', content: 'Amazing band!', created_at: '2024-01-15T10:30:00Z' }
      ]
    }
  };
  return mockData[artistId] || null;
};

const ArtistPage = () => {
  const { id: artistId } = useParams();
  const navigate = useNavigate();

  const [artist, setArtist] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = { username: 'CurrentUser', isLoggedIn: true };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchArtistData(artistId);
      if (!data) {
        setError('Artist not found');
        setLoading(false);
        return;
      }
      setArtist(data.artist);
      setTopTracks(data.topTracks);
      setAlbums(data.albums);
      setComments(data.comments);
      setLoading(false);
    };
    loadData();
  }, [artistId]);

  const formatNumber = (n) => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n;
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleFavorite = () => {
    setArtist(prev => ({ ...prev, is_favorite: !prev.is_favorite }));
  };

  const handleCommentSubmit = () => {
    if (!newComment.trim()) return;
    const newItem = {
      id: comments.length + 1,
      username: user.username,
      content: newComment,
      created_at: new Date().toISOString()
    };
    setComments([newItem, ...comments]);
    setNewComment('');
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!artist) return null;

  return (
    <div className="artist-page">
      <div className="artist-container">
        <div className="artist-header">
          <img src={artist.image} alt={artist.name} className="artist-image" />
          <h1 className="artist-name">{artist.name}</h1>
          <p className="artist-bio">{artist.bio}</p>
        </div>

        <div className="artist-metrics">
          <p>Followers: {formatNumber(artist.followers)}</p>
          <p>Monthly Listeners: {formatNumber(artist.monthly_listeners)}</p>
          <p>Popularity: {artist.popularity}</p>
          {artist.verified && <p className="verified">✔ Verified</p>}
        </div>

        <div className="artist-buttons">
          <button onClick={handleFavorite} className="btn-favorite">
            <Heart size={16} /> {artist.is_favorite ? 'Unfavorite' : 'Favorite'}
          </button>
          <button className="btn-play">
            <Play size={16} /> Play
          </button>
        </div>

        <div className="artist-top-tracks">
          <h2><Music size={18} /> Top Tracks</h2>
          {topTracks.map((track, idx) => (
            <div key={track.id} className="track-item">
              <span>{idx + 1}. {track.name}</span>
              <span>{track.duration}</span>
            </div>
          ))}
        </div>

        <div className="artist-albums">
          <h2>Albums</h2>
          <div className="album-grid">
            {albums.map(album => (
              <div key={album.id} className="album-card">
                <img src={album.image} alt={album.name} className="album-image" />
                <p>{album.name} ({album.year})</p>
              </div>
            ))}
          </div>
        </div>

        <div className="artist-comments">
          <h2><MessageCircle size={18} /> Comments ({comments.length})</h2>
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="comment-input"
          />
          <button onClick={handleCommentSubmit} className="comment-button">Post</button>

          <div className="comment-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <strong>{comment.username}</strong> <span>{formatDate(comment.created_at)}</span>
                <p>{comment.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="artist-events">
          <h2><Calendar size={18} /> Upcoming Events</h2>
          <p>No upcoming events</p>
        </div>
      </div>
    </div>
  );
};

export default ArtistPage;
