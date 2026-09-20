export default function ResultsList({ listings, distanceMiles }) {
  if (!listings) return null;

  if (listings.length === 0) {
    return <p className="empty">No listings found along this route. Try a wider radius or a different search term.</p>;
  }

  return (
    <div className="results-list">
      <h2>
        {listings.length} listing{listings.length === 1 ? '' : 's'} found along a {Math.round(distanceMiles)}-mile trip
      </h2>
      <ul>
        {listings.map((listing) => (
          <li key={listing.id} className="listing-card">
            {listing.thumbnail ? (
              <img src={listing.thumbnail} alt="" />
            ) : (
              <div className="thumbnail-placeholder" />
            )}
            <div className="listing-info">
              <a href={listing.url} target="_blank" rel="noreferrer">
                {listing.title || 'Untitled listing'}
              </a>
              <div className="price">{listing.priceText || (listing.price != null ? `$${listing.price}` : '')}</div>
              <div className="meta">
                Mile {listing.mileMarker} of your trip
                {listing.locationText ? ` · ${listing.locationText}` : ''}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
