/* eslint-disable react-hooks/exhaustive-deps */
import useMyAPI from 'components/hooks/useMyAPI';
import SearchQuery from 'components/visual/SearchBar/search-query';
import { useCallback } from 'react';
import { AlertItem } from './useAlerts';

// Specification interface of this hook.
export interface UsingPromiseAPI {
  fetchAlert: (alertId: string) => Promise<AlertItem>;
  onApplyWorkflowAction: (
    query: SearchQuery,
    selectedStatus: string,
    selectedPriority: string,
    addedLabels: string[],
    removedLabels: string[]
  ) => Promise<boolean>;
  onTakeOwnership: (query: SearchQuery) => Promise<boolean>;
  setVerdict: (alert_id: string, verdict: 'malicious' | 'non_malicious') => Promise<boolean>;
}

// Stateless hook that returns promise wrappers around AL's rest api.
export default function usePromiseAPI(): UsingPromiseAPI {
  //
  const { apiCall } = useMyAPI();

  // Hook API: fetch the alert for the specified alert_id.
  const fetchAlert = async (alertId: string): Promise<AlertItem> =>
    new Promise<AlertItem>((resolve, reject) => {
      const url = `/api/v4/alert/${alertId}/`;
      apiCall({
        url,
        onSuccess: api_data => {
          resolve(api_data.api_response);
        },
        onFailure: api_data => reject(api_data)
      });
    });

  // Hook API: apply workflow actions
  const onApplyWorkflowAction = async (
    query: SearchQuery,
    selectedStatus: string,
    selectedPriority: string,
    addedLabels: string[],
    removedLabels: string[]
  ): Promise<boolean> => {
    const actionPromise = new Promise((resolve, reject) => {
      apiCall({
        url: `/api/v4/alert/all/batch/?${query.buildAPIQueryString()}`,
        method: 'post',
        body: {
          priority: selectedPriority,
          status: selectedStatus,
          labels: addedLabels,
          removed_labels: removedLabels
        },
        onSuccess: () => {
          resolve(true);
        },
        onFailure: api_data => reject(api_data)
      });
    });
    return actionPromise.then(() => true);
  };

  // Hook API: take ownership of alerts matching specified query.
  const onTakeOwnership = async (query: SearchQuery): Promise<boolean> =>
    new Promise((resolve, reject) => {
      apiCall({
        url: `/api/v4/alert/ownership/batch/?${query.buildAPIQueryString()}`,
        onSuccess: () => {
          resolve(true);
        },
        onFailure: api_data => reject(api_data)
      });
    });

  // Hook API: set the verdict on a selected alert
  const setVerdict = async (alert_id: string, verdict: 'malicious' | 'non_malicious'): Promise<boolean> =>
    new Promise((resolve, reject) => {
      apiCall({
        method: 'PUT',
        url: `/api/v4/alert/verdict/${alert_id}/${verdict}/`,
        onSuccess: () => {
          resolve(true);
        },
        onFailure: api_data => reject(api_data)
      });
    });

  // Wrap each exposed method in 'useCallback' hook in order to ensure they are memoized and do not
  //  cause re-renders.
  return {
    fetchAlert: useCallback(fetchAlert, []),
    onApplyWorkflowAction: useCallback(onApplyWorkflowAction, []),
    onTakeOwnership: useCallback(onTakeOwnership, []),
    setVerdict: useCallback(setVerdict, [])
  };
}
