import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const ComponentsPage = lazy(() => import("./pages/Components"));
const UnrelatedPage = lazy(() => import("./pages/Unrelated"));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<div>Home</div>} />
        <Route path="components" element={<ComponentsPage />} />
        <Route path="unrelated" element={<UnrelatedPage />} />
      </Routes>
    </BrowserRouter>
  );
}
