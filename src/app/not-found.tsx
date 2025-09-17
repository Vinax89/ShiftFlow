export default function NotFound() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        The page you’re looking for doesn’t exist.
      </p>
      <a href="/" className="inline-block mt-4 underline">Go home</a>
    </div>
  )
}
