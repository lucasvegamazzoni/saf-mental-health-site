import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Stories from './pages/Stories';
import Resources from './pages/Resources';
import ResourceTopic from './pages/ResourceTopic';
import Me from './pages/Me';
import Account from './pages/Account';
import Moderate from './pages/Moderate';
import Trends from './pages/Trends';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/check-in" element={<Me initialTab="check-in" />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/resources/:topic" element={<ResourceTopic />} />
          <Route path="/me" element={<Me />} />
          <Route path="/account" element={<Account />} />
          <Route path="/moderate" element={<Moderate />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
