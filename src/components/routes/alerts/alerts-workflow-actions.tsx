import { Alert, Button, CircularProgress, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import SearchQuery, { SearchFilter } from 'components/visual/SearchBar/search-query';
import React, { SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertState } from './alerts';
import AlertsFiltersSelected from './alerts-filters-selected';

const POSSIBLE_STATUS = ['ASSESS', 'MALICIOUS', 'NON-MALICIOUS'];
const POSSIBLE_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const DEFAULT_LABELS = [
  'PHISHING',
  'CRIME',
  'ATTRIBUTED',
  'WHITELISTED',
  'FALSE_POSITIVE',
  'REPORTED',
  'MITIGATED',
  'PENDING'
];

type AlertsWorkflowActionsProps = {
  searchQuery: SearchQuery;
  alert: AlertState;
  labelFilters: SearchFilter[];
  onApplyBtnClick: (status: string, selectedPriority: string, selectedLabels: string[]) => void;
};

const AlertsWorkflowActions: React.FC<AlertsWorkflowActionsProps> = ({
  searchQuery,
  alert,
  labelFilters,
  onApplyBtnClick
}) => {
  const { t } = useTranslation('alerts');
  const theme = useTheme();
  const [formValid, setFormValid] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [possibleLabels] = useState<string[]>([
    ...DEFAULT_LABELS,
    ...labelFilters.filter(lbl => DEFAULT_LABELS.indexOf(lbl.label) === -1).map(val => val.label)
  ]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const validateForm = (status: string, priority: string, labels: string[]) => {
    const valid = (status || priority || (labels && labels.length > 0)) as boolean;
    setFormValid(valid);
  };

  const onStatusChange = (selection: string) => {
    validateForm(selection, selectedPriority, selectedLabels);
    setSelectedStatus(selection);
  };

  const onPriorityChange = (selection: string) => {
    validateForm(selectedStatus, selection, selectedLabels);
    setSelectedPriority(selection);
  };

  const onLabelChange = (selections: string[]) => {
    validateForm(selectedStatus, selectedPriority, selections);
    setSelectedLabels(selections.map(val => val.toUpperCase()));
  };

  const _onApplyBtnClick = () => {
    if (formValid) {
      setApplying(true);
      onApplyBtnClick(selectedStatus, selectedPriority, selectedLabels);
    }
  };

  const emptyFilters = () => {
    const filters = searchQuery.parseFilters();
    if (
      filters.tc === '' &&
      filters.labels.length === 0 &&
      filters.priorities.length === 0 &&
      filters.queries.length === 0 &&
      filters.statuses.length === 0
    ) {
      return true;
    }

    return false;
  };

  const query = searchQuery.getQuery();

  return (
    <div>
      <div style={{ margin: theme.spacing(1), marginBottom: theme.spacing(2) }}>
        <Typography variant="h4">{t('workflow.title')}</Typography>
      </div>
      <div style={{ margin: theme.spacing(1) }}>
        <Alert severity={query && query.startsWith('alert_id') && alert ? 'info' : 'warning'}>
          {query || !emptyFilters()
            ? query && query.startsWith('alert_id') && alert
              ? t('workflow.impact.low')
              : t('workflow.impact.high')
            : t('workflow.impact.all')}
        </Alert>
      </div>

      {(query || !emptyFilters()) && (
        <div style={{ margin: theme.spacing(1) }}>
          <div
            style={{
              wordBreak: 'break-word',
              marginTop: theme.spacing(1),
              padding: theme.spacing(2),
              color: theme.palette.primary.light,
              backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[200]
            }}
          >
            <AlertsFiltersSelected searchQuery={searchQuery} disableActions hideGroupBy />
          </div>
        </div>
      )}

      <div style={{ margin: theme.spacing(1), marginTop: theme.spacing(2) }}>
        <div style={{ marginBottom: theme.spacing(2) }}>
          <Autocomplete
            fullWidth
            multiple={false}
            options={POSSIBLE_STATUS}
            value={selectedStatus}
            onChange={(event: SyntheticEvent<Element, Event>, value: string) => onStatusChange(value as string)}
            renderInput={params => <TextField {...params} label={t('status')} variant="outlined" />}
          />
        </div>
        <div style={{ marginBottom: theme.spacing(2) }}>
          <Autocomplete
            fullWidth
            multiple={false}
            options={POSSIBLE_PRIORITY}
            value={selectedPriority}
            onChange={(event: SyntheticEvent<Element, Event>, value: string) => onPriorityChange(value as string)}
            renderInput={params => <TextField {...params} label={t('priority')} variant="outlined" />}
          />
        </div>
        <div style={{ marginBottom: theme.spacing(2) }}>
          <Autocomplete
            fullWidth
            multiple
            freeSolo
            options={possibleLabels}
            value={selectedLabels}
            renderInput={params => <TextField {...params} label={t('labels')} variant="outlined" />}
            onChange={(event, value) => onLabelChange(value as string[])}
          />
        </div>
      </div>
      <div style={{ textAlign: 'right', marginTop: theme.spacing(1) }}>
        <Tooltip title={t('workflow.apply')}>
          <Button
            variant="contained"
            color="primary"
            onClick={_onApplyBtnClick}
            startIcon={applying ? <CircularProgress size={20} /> : null}
            disabled={applying || !formValid}
          >
            {t('apply')}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default AlertsWorkflowActions;
