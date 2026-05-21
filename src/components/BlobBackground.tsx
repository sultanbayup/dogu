/**
 * BlobBackground renders the two animated gradient blobs that sit behind
 * every page. They are purely decorative and aria-hidden.
 */
export function BlobBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="blob blob-blue absolute"
        style={{ top: '8%', left: '5%', width: 420, height: 420 }}
      />
      <div
        className="blob blob-red absolute"
        style={{ bottom: '8%', right: '5%', width: 420, height: 420 }}
      />
    </div>
  )
}

export default BlobBackground
