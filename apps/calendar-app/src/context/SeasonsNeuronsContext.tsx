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
  Note,
  SeasonsTopologySnapshot,
  TopologyDateBucket,
  TopologyFeedNode,
  TopologyStreamNode,
} from '@lenta/shared';
import { API_BASE_URL } from '../api/client';
import { useAuth } from './AuthContext';
import { useAppMode } from './AppModeContext';

interface SeasonsNeuronsContextValue {
  apiClient: SeasonsApiClient;
  sseBus: SeasonsSseBus;
  topologyNeuron: TopologyNeuron;
  topology: SeasonsTopologySnapshot | null;
  isSseConnected: boolean;
  lastImpulse: SeasonsLiveNoteImpulse | null;
  refreshTopology: () => Promise<SeasonsTopologySnapshot>;
  getStreamNeuron: (streamSlug: string) => StreamNeuron<Note>;
  getFeedNeuron: (feedSlug: string) => FeedNeuron<Note>;
}

const SeasonsNeuronsContext = createContext<SeasonsNeuronsContextValue | null>(null);

export const SeasonsNeuronsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token, isAdmin } = useAuth();
  const { appMode } = useAppMode();
  const queryClient = useQueryClient();

  const privacyScope = useMemo<'public' | 'all'>(() => {
    if (appMode === 'public') return 'public';
    return isAdmin ? 'all' : 'public';
  }, [appMode, isAdmin]);

  const neuronsRef = useRef<{
    apiClient: SeasonsApiClient;
    sseBus: SeasonsSseBus;
    topologyNeuron: TopologyNeuron;
    streams: Map<string, StreamNeuron<Note>>;
    feeds: Map<string, FeedNeuron<Note>>;
  } | null>(null);

  if (!neuronsRef.current) {
    const apiClient = new SeasonsApiClient({
      baseUrl: API_BASE_URL,
      token: token || undefined,
    });
    const sseBus = new SeasonsSseBus({
      baseUrl: API_BASE_URL,
      token: token || undefined,
      template: { includeTopology: true },
    });
    const topologyNeuron = new TopologyNeuron({
      apiClient,
      sseBus,
      privacy: privacyScope,
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
  const [isSseConnected, setIsSseConnected] = useState<boolean>(false);
  const [lastImpulse, setLastImpulse] = useState<SeasonsLiveNoteImpulse | null>(null);

  // Sync auth token & privacy mode into SeasonsApiClient + SeasonsSseBus
  useEffect(() => {
    apiClient.setToken(token || undefined);
    sseBus.setToken(token || undefined);
    sseBus.connect({ includeTopology: true });
    setIsSseConnected(true);

    void topologyNeuron
      .initialize()
      .then((snap) => {
        setTopology(snap);
      })
      .catch(() => {
        // Non-blocking fallback when backend is starting
      });

    void topologyNeuron
      .refreshSnapshot({ privacy: privacyScope })
      .then((snap) => {
        setTopology(snap);
      })
      .catch(() => {});

    return () => {
      topologyNeuron.disconnect();
      sseBus.disconnect();
      setIsSseConnected(false);
    };
  }, [apiClient, sseBus, topologyNeuron, token, privacyScope]);

  // Subscribe to TopologyNeuron snapshot$ and live SSE impulses -> invalidate React Query caches
  useEffect(() => {
    const topoSub = topologyNeuron.snapshot$.subscribe((snap) => {
      if (snap) {
        setTopology(snap);
      }
    });

    const noteSub = sseBus.noteEvents$.subscribe((impulse) => {
      setLastImpulse(impulse);
      setIsSseConnected(true);
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      void queryClient.invalidateQueries({ queryKey: ['feeds'] });
      void queryClient.invalidateQueries({ queryKey: ['hashtags'] });
    });

    const patchSub = sseBus.topologyPatches$.subscribe(() => {
      setIsSseConnected(true);
      void queryClient.invalidateQueries({ queryKey: ['feeds'] });
    });

    return () => {
      topoSub.unsubscribe();
      noteSub.unsubscribe();
      patchSub.unsubscribe();
    };
  }, [topologyNeuron, sseBus, queryClient]);

  const refreshTopology = useCallback(async () => {
    const snap = await topologyNeuron.refreshSnapshot({ privacy: privacyScope });
    setTopology(snap);
    return snap;
  }, [topologyNeuron, privacyScope]);

  const getStreamNeuron = useCallback(
    (streamSlug: string): StreamNeuron<Note> => {
      const key = streamSlug.toLowerCase().trim();
      const existing = streams.get(key);
      if (existing) return existing;
      const created = new StreamNeuron<Note>({
        streamSlug,
        apiClient,
        sseBus,
        pageSize: 30,
        baseQuery: { privacy: privacyScope },
      });
      streams.set(key, created);
      return created;
    },
    [streams, apiClient, sseBus, privacyScope],
  );

  const getFeedNeuron = useCallback(
    (feedSlug: string): FeedNeuron<Note> => {
      const key = feedSlug.toLowerCase().trim();
      const existing = feeds.get(key);
      if (existing) return existing;
      const created = new FeedNeuron<Note>({
        feedSlug,
        apiClient,
        sseBus,
        pageSize: 30,
        baseQuery: { privacy: privacyScope },
      });
      feeds.set(key, created);
      return created;
    },
    [feeds, apiClient, sseBus, privacyScope],
  );

  const value = useMemo<SeasonsNeuronsContextValue>(
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
    <SeasonsNeuronsContext.Provider value={value}>
      {children}
    </SeasonsNeuronsContext.Provider>
  );
};

export function useSeasonsNeurons(): SeasonsNeuronsContextValue {
  const ctx = useContext(SeasonsNeuronsContext);
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

export function useFeedNeuron(feedSlug?: string, autoConnect = true): {
  state: FeedNeuronState<Note> | null;
  loadNextPage: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { getFeedNeuron } = useSeasonsNeurons();
  const [state, setState] = useState<FeedNeuronState<Note> | null>(null);
  const neuronRef = useRef<FeedNeuron<Note> | null>(null);

  useEffect(() => {
    if (!feedSlug) {
      neuronRef.current = null;
      setState(null);
      return;
    }

    const neuron = getFeedNeuron(feedSlug);
    neuronRef.current = neuron;
    setState(neuron.value);

    const sub = neuron.stateObservable$.subscribe((nextState) => {
      setState(nextState);
    });

    if (autoConnect) {
      void neuron.connect(true).catch(() => {});
    }

    return () => {
      sub.unsubscribe();
    };
  }, [feedSlug, autoConnect, getFeedNeuron]);

  const loadNextPage = useCallback(async () => {
    if (neuronRef.current) {
      await neuronRef.current.loadNextPage();
    }
  }, []);

  const refresh = useCallback(async () => {
    if (neuronRef.current) {
      await neuronRef.current.loadInitialPage();
    }
  }, []);

  return { state, loadNextPage, refresh };
}

export function useStreamNeuron(streamSlug?: string, autoConnect = true): {
  state: StreamNeuronState<Note> | null;
  loadNextPage: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { getStreamNeuron } = useSeasonsNeurons();
  const [state, setState] = useState<StreamNeuronState<Note> | null>(null);
  const neuronRef = useRef<StreamNeuron<Note> | null>(null);

  useEffect(() => {
    if (!streamSlug) {
      neuronRef.current = null;
      setState(null);
      return;
    }

    const neuron = getStreamNeuron(streamSlug);
    neuronRef.current = neuron;
    setState(neuron.value);

    const sub = neuron.stateObservable$.subscribe((nextState) => {
      setState(nextState);
    });

    if (autoConnect) {
      void neuron.connect(true).catch(() => {});
    }

    return () => {
      sub.unsubscribe();
    };
  }, [streamSlug, autoConnect, getStreamNeuron]);

  const loadNextPage = useCallback(async () => {
    if (neuronRef.current) {
      await neuronRef.current.loadNextPage();
    }
  }, []);

  const refresh = useCallback(async () => {
    if (neuronRef.current) {
      await neuronRef.current.loadInitialPage();
    }
  }, []);

  return { state, loadNextPage, refresh };
}
