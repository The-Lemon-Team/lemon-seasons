import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  FeedNeuron,
  FeedNeuronState,
  SeasonsApiClient,
  SeasonsLiveNoteImpulse,
  SeasonsSseBus,
  StreamNeuron,
  StreamNeuronState,
  TopologyNeuron,
} from '@lenta/seasons-neurons';
import {
  SeasonsTopologySnapshot,
  TopologyDateBucket,
  TopologyFeedNode,
  TopologyStreamNode,
} from '@lenta/shared';
import { API_BASE_URL } from '../api/client';

const ADMIN_TOKEN =
  import.meta.env.VITE_ADMIN_TOKEN ||
  'lenta_adm_master_permanent_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';

interface AdminSeasonsNeuronsContextValue {
  apiClient: SeasonsApiClient;
  sseBus: SeasonsSseBus;
  topologyNeuron: TopologyNeuron;
  topology: SeasonsTopologySnapshot | null;
  isSseConnected: boolean;
  lastImpulse: SeasonsLiveNoteImpulse | null;
  refreshTopology: () => Promise<SeasonsTopologySnapshot>;
  getStreamNeuron: (streamSlug: string) => StreamNeuron<any>;
  getFeedNeuron: (feedSlug: string) => FeedNeuron<any>;
}

const AdminSeasonsNeuronsContext = createContext<AdminSeasonsNeuronsContextValue | null>(null);

export const SeasonsNeuronsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();

  const neuronsRef = useRef<{
    apiClient: SeasonsApiClient;
    sseBus: SeasonsSseBus;
    topologyNeuron: TopologyNeuron;
    streams: Map<string, StreamNeuron<any>>;
    feeds: Map<string, FeedNeuron<any>>;
  } | null>(null);

  if (!neuronsRef.current) {
    const apiClient = new SeasonsApiClient({
      baseUrl: API_BASE_URL,
      token: ADMIN_TOKEN,
    });
    const sseBus = new SeasonsSseBus({
      baseUrl: API_BASE_URL,
      token: ADMIN_TOKEN,
      template: { includeTopology: true },
    });
    const topologyNeuron = new TopologyNeuron({
      apiClient,
      sseBus,
      privacy: 'all',
    });
    neuronsRef.current = {
      apiClient,
      sseBus,
      topologyNeuron,
      streams: new Map(),
      feeds: new Map(),
    };
  }

  const { apiClient, sseBus, topologyNeuron, streams, feeds } = neuronsRef.current;

  const [topology, setTopology] = useState<SeasonsTopologySnapshot | null>(() =>
    topologyNeuron.getSnapshot(),
  );
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [lastImpulse, setLastImpulse] = useState<SeasonsLiveNoteImpulse | null>(null);

  useEffect(() => {
    sseBus.connect({ includeTopology: true });
    setIsSseConnected(true);

    void topologyNeuron
      .initialize()
      .then((snap) => setTopology(snap))
      .catch(() => {});

    const topoSub = topologyNeuron.snapshot$.subscribe((snap) => {
      if (snap) setTopology(snap);
    });

    const noteSub = sseBus.noteEvents$.subscribe((impulse) => {
      setLastImpulse(impulse);
      setIsSseConnected(true);
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      void queryClient.invalidateQueries({ queryKey: ['feeds'] });
      void queryClient.invalidateQueries({ queryKey: ['streams'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    const patchSub = sseBus.topologyPatches$.subscribe(() => {
      setIsSseConnected(true);
      void queryClient.invalidateQueries({ queryKey: ['feeds'] });
      void queryClient.invalidateQueries({ queryKey: ['streams'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    return () => {
      topoSub.unsubscribe();
      noteSub.unsubscribe();
      patchSub.unsubscribe();
      topologyNeuron.disconnect();
      sseBus.disconnect();
      setIsSseConnected(false);
    };
  }, [sseBus, topologyNeuron, queryClient]);

  const refreshTopology = useCallback(async () => {
    const snap = await topologyNeuron.refreshSnapshot({ privacy: 'all' });
    setTopology(snap);
    return snap;
  }, [topologyNeuron]);

  const getStreamNeuron = useCallback(
    (streamSlug: string): StreamNeuron<any> => {
      const key = streamSlug.toLowerCase().trim();
      const existing = streams.get(key);
      if (existing) return existing;
      const created = new StreamNeuron<any>({
        streamSlug,
        apiClient,
        sseBus,
        pageSize: 30,
        baseQuery: { privacy: 'all' },
      });
      streams.set(key, created);
      return created;
    },
    [streams, apiClient, sseBus],
  );

  const getFeedNeuron = useCallback(
    (feedSlug: string): FeedNeuron<any> => {
      const key = feedSlug.toLowerCase().trim();
      const existing = feeds.get(key);
      if (existing) return existing;
      const created = new FeedNeuron<any>({
        feedSlug,
        apiClient,
        sseBus,
        pageSize: 30,
        baseQuery: { privacy: 'all' },
      });
      feeds.set(key, created);
      return created;
    },
    [feeds, apiClient, sseBus],
  );

  const value = useMemo<AdminSeasonsNeuronsContextValue>(
    () => ({
      apiClient,
      sseBus,
      topologyNeuron,
      topology,
      isSseConnected,
      lastImpulse,
      refreshTopology,
      getStreamNeuron,
      getFeedNeuron,
    }),
    [
      apiClient,
      sseBus,
      topologyNeuron,
      topology,
      isSseConnected,
      lastImpulse,
      refreshTopology,
      getStreamNeuron,
      getFeedNeuron,
    ],
  );

  return (
    <AdminSeasonsNeuronsContext.Provider value={value}>
      {children}
    </AdminSeasonsNeuronsContext.Provider>
  );
};

export function useSeasonsNeurons(): AdminSeasonsNeuronsContextValue {
  const ctx = useContext(AdminSeasonsNeuronsContext);
  if (!ctx) {
    throw new Error('useSeasonsNeurons must be used inside SeasonsNeuronsProvider');
  }
  return ctx;
}

export function useTopologyNeuron(): {
  topology: SeasonsTopologySnapshot | null;
  streams: TopologyStreamNode[];
  feeds: TopologyFeedNode[];
  dateBuckets: TopologyDateBucket[];
  revision: number;
  isSseConnected: boolean;
  lastImpulse: SeasonsLiveNoteImpulse | null;
  refresh: () => Promise<SeasonsTopologySnapshot>;
} {
  const { topology, isSseConnected, lastImpulse, refreshTopology } = useSeasonsNeurons();
  return {
    topology,
    streams: topology?.streams ?? [],
    feeds: topology?.feeds ?? [],
    dateBuckets: topology?.facets?.dateBuckets ?? [],
    revision: topology?.revision ?? 0,
    isSseConnected,
    lastImpulse,
    refresh: refreshTopology,
  };
}

export function useFeedNeuron(feedSlug?: string): {
  state: FeedNeuronState<any> | null;
  loadNextPage: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { getFeedNeuron } = useSeasonsNeurons();
  const [state, setState] = useState<FeedNeuronState<any> | null>(null);
  const neuronRef = useRef<FeedNeuron<any> | null>(null);

  useEffect(() => {
    if (!feedSlug) {
      neuronRef.current = null;
      setState(null);
      return;
    }
    const neuron = getFeedNeuron(feedSlug);
    neuronRef.current = neuron;
    setState(neuron.value);
    const sub = neuron.stateObservable$.subscribe(setState);
    void neuron.connect(true).catch(() => {});
    return () => sub.unsubscribe();
  }, [feedSlug, getFeedNeuron]);

  return {
    state,
    loadNextPage: async () => {
      if (neuronRef.current) await neuronRef.current.loadNextPage();
    },
    refresh: async () => {
      if (neuronRef.current) await neuronRef.current.loadInitialPage();
    },
  };
}

export function useStreamNeuron(streamSlug?: string): {
  state: StreamNeuronState<any> | null;
  loadNextPage: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { getStreamNeuron } = useSeasonsNeurons();
  const [state, setState] = useState<StreamNeuronState<any> | null>(null);
  const neuronRef = useRef<StreamNeuron<any> | null>(null);

  useEffect(() => {
    if (!streamSlug) {
      neuronRef.current = null;
      setState(null);
      return;
    }
    const neuron = getStreamNeuron(streamSlug);
    neuronRef.current = neuron;
    setState(neuron.value);
    const sub = neuron.stateObservable$.subscribe(setState);
    void neuron.connect(true).catch(() => {});
    return () => sub.unsubscribe();
  }, [streamSlug, getStreamNeuron]);

  return {
    state,
    loadNextPage: async () => {
      if (neuronRef.current) await neuronRef.current.loadNextPage();
    },
    refresh: async () => {
      if (neuronRef.current) await neuronRef.current.loadInitialPage();
    },
  };
}
