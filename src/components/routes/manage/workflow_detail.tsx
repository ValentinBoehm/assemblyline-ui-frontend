import EditOffOutlinedIcon from '@mui/icons-material/EditOffOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import YoutubeSearchedForIcon from '@mui/icons-material/YoutubeSearchedFor';
import {
  Autocomplete,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Theme,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import FormControl from '@mui/material/FormControl';
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import withStyles from '@mui/styles/withStyles';
import Throttler from 'commons/addons/utils/throttler';
import useAppUser from 'commons/components/app/hooks/useAppUser';
import PageCenter from 'commons/components/pages/PageCenter';
import useALContext from 'components/hooks/useALContext';
import useMyAPI from 'components/hooks/useMyAPI';
import useMySnackbar from 'components/hooks/useMySnackbar';
import { CustomUser } from 'components/models/ui/user';
import Classification from 'components/visual/Classification';
import ConfirmationDialog from 'components/visual/ConfirmationDialog';
import Histogram from 'components/visual/Histogram';
import { RouterPrompt } from 'components/visual/RouterPrompt';
import AlertsTable from 'components/visual/SearchResult/alerts';
import 'moment/locale/fr';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Moment from 'react-moment';
import { useNavigate } from 'react-router';
import { Link, useParams } from 'react-router-dom';
import ForbiddenPage from '../403';

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

export type Workflow = {
  classification: string;
  creation_date?: number;
  creator?: string;
  edited_by?: string;
  first_seen?: string;
  hit_count: number;
  labels: string[];
  last_edit?: string;
  last_seen?: string;
  name: string;
  origin: string;
  priority: string;
  query: string;
  status: string;
  workflow_id?: string;
};

type ParamProps = {
  id: string;
};

type WorkflowDetailProps = {
  workflow_id?: string;
  close?: () => void;
  mode?: 'read' | 'write';
};

const MyMenuItem = withStyles((theme: Theme) =>
  createStyles({
    root: {
      minHeight: theme.spacing(4)
    }
  })
)(MenuItem);

const useStyles = makeStyles(theme => ({
  buttonProgress: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12
  }
}));

const THROTTLER = new Throttler(250);

const WrappedWorkflowDetail = ({ workflow_id, close, mode = 'read' }: WorkflowDetailProps) => {
  const { t, i18n } = useTranslation(['manageWorkflowDetail']);
  const { id } = useParams<ParamProps>();
  const theme = useTheme();
  const [workflow, setWorkflow] = useState<Workflow>(null);
  const [originalWorkflow, setOriginalWorkflow] = useState<Workflow>(null);
  const [histogram, setHistogram] = useState(null);
  const [results, setResults] = useState<any>(null);
  const [hits, setHits] = useState(0);
  const [runWorkflow, setRunWorkflow] = useState(false);
  const [modified, setModified] = useState(false);
  const [badQuery, setBadQuery] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [viewMode, setViewMode] = useState(mode);
  const { c12nDef } = useALContext();
  const { user: currentUser } = useAppUser<CustomUser>();
  const { showSuccessMessage, showErrorMessage } = useMySnackbar();
  const { apiCall } = useMyAPI();
  const classes = useStyles();
  const navigate = useNavigate();

  const DEFAULT_WORKFLOW = {
    classification: c12nDef.UNRESTRICTED,
    hit_count: 0,
    labels: [],
    name: '',
    priority: '',
    query: '',
    status: '',
    origin: ''
  };

  useEffect(() => {
    if ((workflow_id || id) && currentUser.roles.includes('workflow_view')) {
      apiCall({
        url: `/api/v4/workflow/${workflow_id || id}/`,
        onSuccess: api_data => {
          setWorkflow({
            ...api_data.api_response,
            status: api_data.api_response.status || '',
            priority: api_data.api_response.priority || ''
          });
          setOriginalWorkflow({
            ...api_data.api_response,
            status: api_data.api_response.status || '',
            priority: api_data.api_response.priority || '',
            labels: api_data.api_response.labels || []
          });

          apiCall({
            method: 'POST',
            url: '/api/v4/search/histogram/alert/events.ts/',
            body: {
              query: `events.entity_id:${workflow_id || id}`,
              mincount: 0,
              start: 'now-30d/d',
              end: 'now+1d/d-1s',
              gap: '+1d'
            },
            onSuccess: hist_data => {
              setHistogram(hist_data.api_response);
            }
          });
          apiCall({
            method: 'GET',
            url: `/api/v4/search/alert/?query=events.entity_id:${workflow_id || id}&rows=10`,
            onSuccess: top_data => {
              setResults(top_data.api_response);
            }
          });
        },
        onFailure: api_data => {
          showErrorMessage(api_data.api_error_message);
          close();
        }
      });
      setViewMode('read');
    } else {
      setViewMode('write');
      setWorkflow({ ...DEFAULT_WORKFLOW });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow_id, id]);

  const handleNameChange = event => {
    setModified(true);
    setWorkflow({ ...workflow, name: event.target.value });
  };

  const handleQueryChange = event => {
    setModified(true);
    setWorkflow({ ...workflow, query: event.target.value });
    THROTTLER.delay(() => {
      if (event.target.value !== '') {
        apiCall({
          method: 'GET',
          url: `/api/v4/search/alert/?query=${encodeURI(event.target.value)}&rows=0&track_total_hits=true`,
          onSuccess: api_data => {
            setHits(api_data.api_response.total || 0);
            setBadQuery(false);
          },
          onFailure: () => {
            setResults(0);
            setBadQuery(true);
          }
        });
      } else {
        setResults(0);
        setBadQuery(false);
      }
    });
  };

  const handleCheckboxChange = () => {
    setRunWorkflow(!runWorkflow);
  };

  const handleLabelsChange = labels => {
    setModified(true);
    setWorkflow({ ...workflow, labels: labels.map(label => label.toUpperCase()) });
  };

  const handlePriorityChange = event => {
    setModified(true);
    setWorkflow({ ...workflow, priority: event.target.value });
  };

  const handleStatusChange = event => {
    setModified(true);
    setWorkflow({ ...workflow, status: event.target.value });
  };

  const setClassification = classification => {
    setModified(true);
    setWorkflow({ ...workflow, classification });
  };

  const removeWorkflow = () => {
    apiCall({
      url: `/api/v4/workflow/${workflow_id || id}/`,
      method: 'DELETE',
      onSuccess: () => {
        setDeleteDialog(false);
        showSuccessMessage(t('delete.success'));
        if (id) {
          setTimeout(() => navigate('/manage/workflows'), 1000);
        }
        setTimeout(() => window.dispatchEvent(new CustomEvent('reloadWorkflows')), 1000);
        close();
      },
      onEnter: () => setButtonLoading(true),
      onExit: () => setButtonLoading(false)
    });
  };

  const saveWorkflow = () => {
    apiCall({
      url:
        workflow_id || id
          ? `/api/v4/workflow/${workflow_id || id}/?run_workflow=${runWorkflow}`
          : `/api/v4/workflow/?run_workflow=${runWorkflow}`,
      method: workflow_id || id ? 'POST' : 'PUT',
      body: {
        ...workflow,
        priority: workflow.priority === '' ? null : workflow.priority,
        status: workflow.status === '' ? null : workflow.status
      },
      onSuccess: () => {
        showSuccessMessage(t(workflow_id || id ? 'save.success' : 'add.success'));
        setModified(false);
        setTimeout(() => window.dispatchEvent(new CustomEvent('reloadWorkflows')), 1000);
        setViewMode('read');
        if (!(workflow_id || id)) close();
      },
      onEnter: () => setButtonLoading(true),
      onExit: () => setButtonLoading(false)
    });
  };

  return currentUser.roles.includes('workflow_view') ? (
    <PageCenter margin={!id ? 2 : 4} width="100%">
      <ConfirmationDialog
        open={deleteDialog}
        handleClose={() => setDeleteDialog(false)}
        handleAccept={removeWorkflow}
        title={t('delete.title')}
        cancelText={t('delete.cancelText')}
        acceptText={t('delete.acceptText')}
        text={t('delete.text')}
        waiting={buttonLoading}
      />

      {c12nDef.enforce && (
        <div style={{ paddingBottom: theme.spacing(4) }}>
          <Classification
            type="picker"
            c12n={workflow ? workflow.classification : null}
            setClassification={setClassification}
            disabled={!currentUser.roles.includes('workflow_manage') || viewMode === 'read'}
          />
        </div>
      )}
      <div style={{ textAlign: 'left' }}>
        <div style={{ paddingBottom: theme.spacing(4) }}>
          <Grid container alignItems="center">
            <Grid item xs>
              <Typography variant="h4">{t(workflow_id || id ? 'title' : 'add.title')}</Typography>
              <Typography variant="caption">
                {workflow ? workflow.workflow_id : <Skeleton style={{ width: '10rem' }} />}
              </Typography>
            </Grid>
            {(workflow_id || id) && currentUser.roles.includes('workflow_view') && viewMode === 'read' && (
              <Grid item xs={12} sm style={{ textAlign: 'right', flexGrow: 0 }}>
                {workflow ? (
                  <Tooltip title={t('usage')}>
                    <IconButton
                      component={Link}
                      style={{ color: theme.palette.action.active }}
                      to={`/search/alert/?query=events.entity_id:${workflow_id || id}`}
                      size="large"
                    >
                      <YoutubeSearchedForIcon />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Grid>
            )}
            {(workflow_id || id) && currentUser.roles.includes('workflow_manage') && (
              <Grid item xs={12} sm style={{ textAlign: 'right', flexGrow: 0 }}>
                {workflow ? (
                  <Tooltip title={t(viewMode === 'read' ? 'edit' : 'cancel')}>
                    <IconButton
                      style={{
                        color:
                          viewMode === 'read'
                            ? theme.palette.mode === 'dark'
                              ? theme.palette.info.light
                              : theme.palette.info.dark
                            : theme.palette.mode === 'dark'
                            ? theme.palette.error.light
                            : theme.palette.error.dark
                      }}
                      onClick={() => {
                        if (viewMode === 'read') {
                          // Switch to write mode
                          setViewMode('write');
                        } else {
                          // Reset the state of the workflow, cancel changes
                          setViewMode('read');
                          setWorkflow(originalWorkflow);
                          setModified(false);
                        }
                      }}
                      size="large"
                    >
                      {viewMode === 'read' ? <EditOutlinedIcon /> : <EditOffOutlinedIcon />}
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Skeleton variant="circular" height="2.5rem" width="2.5rem" style={{ margin: theme.spacing(0.5) }} />
                )}
              </Grid>
            )}
            {(workflow_id || id) && currentUser.roles.includes('workflow_manage') && viewMode === 'read' && (
              <Grid item xs={12} sm style={{ textAlign: 'right', flexGrow: 0 }}>
                {workflow ? (
                  <Tooltip title={t('remove')}>
                    <IconButton
                      style={{
                        color: theme.palette.mode === 'dark' ? theme.palette.error.light : theme.palette.error.dark
                      }}
                      onClick={() => setDeleteDialog(true)}
                      size="large"
                    >
                      <RemoveCircleOutlineOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Skeleton variant="circular" height="2.5rem" width="2.5rem" style={{ margin: theme.spacing(0.5) }} />
                )}
              </Grid>
            )}
          </Grid>
        </div>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2">{t('name')}</Typography>
            {workflow ? (
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="outlined"
                onChange={handleNameChange}
                value={workflow.name}
                disabled={!currentUser.roles.includes('workflow_manage') || viewMode === 'read'}
              />
            ) : (
              <Skeleton style={{ height: '2.5rem' }} />
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2">{t('query')}</Typography>
            {workflow ? (
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="outlined"
                error={badQuery}
                onChange={handleQueryChange}
                value={workflow.query}
                disabled={!currentUser.roles.includes('workflow_manage') || viewMode === 'read'}
              />
            ) : (
              <Skeleton style={{ height: '2.5rem' }} />
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2">{t('labels')}</Typography>
            {workflow ? (
              <Autocomplete
                fullWidth
                multiple
                freeSolo
                options={DEFAULT_LABELS}
                value={workflow.labels}
                renderInput={params => <TextField {...params} variant="outlined" />}
                onChange={(event, value) => handleLabelsChange(value as string[])}
                disabled={!currentUser.roles.includes('workflow_manage') || viewMode === 'read'}
              />
            ) : (
              <Skeleton style={{ height: '2.5rem' }} />
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">{t('priority')}</Typography>
            {workflow ? (
              <FormControl size="small" fullWidth>
                <Select
                  id="priority"
                  fullWidth
                  value={workflow.priority}
                  onChange={handlePriorityChange}
                  variant="outlined"
                  disabled={!currentUser.roles.includes('workflow_manage') || viewMode === 'read'}
                >
                  <MyMenuItem value="">{t('priority.null')}</MyMenuItem>
                  <MyMenuItem value="LOW">{t('priority.LOW')}</MyMenuItem>
                  <MyMenuItem value="MEDIUM">{t('priority.MEDIUM')}</MyMenuItem>
                  <MyMenuItem value="HIGH">{t('priority.HIGH')}</MyMenuItem>
                  <MyMenuItem value="CRITICAL">{t('priority.CRITICAL')}</MyMenuItem>
                </Select>
              </FormControl>
            ) : (
              <Skeleton style={{ height: '2.5rem' }} />
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">{t('status')}</Typography>
            {workflow ? (
              <FormControl size="small" fullWidth>
                <Select
                  id="priority"
                  fullWidth
                  value={workflow.status}
                  onChange={handleStatusChange}
                  variant="outlined"
                  disabled={!currentUser.roles.includes('workflow_manage') || viewMode === 'read'}
                >
                  <MyMenuItem value="">{t('status.null')}</MyMenuItem>
                  <MyMenuItem value="MALICIOUS">{t('status.MALICIOUS')}</MyMenuItem>
                  <MyMenuItem value="NON-MALICIOUS">{t('status.NON-MALICIOUS')}</MyMenuItem>
                  <MyMenuItem value="ASSESS">{t('status.ASSESS')}</MyMenuItem>
                </Select>
              </FormControl>
            ) : (
              <Skeleton style={{ height: '2.5rem' }} />
            )}
          </Grid>
        </Grid>

        <RouterPrompt when={modified} />

        {workflow && viewMode === 'write' && (
          <>
            <div
              style={{
                position: 'inherit',
                textAlign: 'left'
              }}
            >
              <FormControlLabel
                control={<Checkbox onChange={handleCheckboxChange} checked={runWorkflow}></Checkbox>}
                label={
                  <Typography variant="body2">
                    {t('backport_workflow_prompt')} ({hits} {t('backport_workflow_matching')})
                  </Typography>
                }
              ></FormControlLabel>
            </div>
            <div
              style={{
                paddingTop: id ? theme.spacing(1) : theme.spacing(2),
                paddingBottom: id ? theme.spacing(1) : theme.spacing(2),
                position: id ? 'fixed' : 'inherit',
                bottom: id ? 0 : 'inherit',
                left: id ? 0 : 'inherit',
                width: id ? '100%' : 'inherit',
                textAlign: id ? 'center' : 'right',
                zIndex: id ? theme.zIndex.drawer - 1 : 'auto',
                backgroundColor: id ? theme.palette.background.default : 'inherit',
                boxShadow: id ? theme.shadows[4] : 'inherit'
              }}
            >
              <Button
                variant="contained"
                color="primary"
                disabled={buttonLoading || !modified || badQuery || workflow?.query === '' || workflow?.name === ''}
                onClick={saveWorkflow}
              >
                {t(workflow_id || id ? 'save' : 'add.button')}
                {buttonLoading && <CircularProgress size={24} className={classes.buttonProgress} />}
              </Button>
            </div>
          </>
        )}
        {viewMode === 'read' ? (
          <Grid style={{ paddingTop: theme.spacing(4) }}>
            <Grid container>
              <Grid item xs={12}>
                <Typography variant="h6">{t('statistics')}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 600, fontStyle: 'italic' }}>
                  {t('hits')}
                </Typography>
                <Grid container>
                  <Grid item xs={3} sm={4} md={3} lg={3}>
                    <span style={{ fontWeight: 500 }}>{t('hit.count')}</span>
                  </Grid>
                  <Grid item xs={9} sm={8} md={9} lg={9}>
                    {workflow ? workflow.hit_count : 0}
                  </Grid>
                  <Grid item xs={3} sm={4} md={3} lg={3}>
                    <span style={{ fontWeight: 500 }}>{t('hit.first')}</span>
                  </Grid>
                  <Grid item xs={9} sm={8} md={9} lg={9}>
                    {workflow && workflow.first_seen ? (
                      <Moment fromNow locale={i18n.language}>
                        {workflow.first_seen}
                      </Moment>
                    ) : (
                      t('hit.none')
                    )}
                  </Grid>
                  <Grid item xs={3} sm={4} md={3} lg={3}>
                    <span style={{ fontWeight: 500 }}>{t('hit.last')}</span>
                  </Grid>
                  <Grid item xs={9} sm={8} md={9} lg={9}>
                    {workflow && workflow.last_seen ? (
                      <Moment fromNow locale={i18n.language}>
                        {workflow.last_seen}
                      </Moment>
                    ) : (
                      t('hit.none')
                    )}
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 600, fontStyle: 'italic' }}>
                  {t('details')}
                </Typography>
                <Grid container>
                  <Grid item xs={3} sm={4} md={3} lg={3}>
                    <span style={{ fontWeight: 500 }}>{t('created_by')}:</span>
                  </Grid>
                  <Grid item xs={9} sm={8} md={9} lg={9}>
                    {workflow && workflow.creator ? (
                      <>
                        {workflow.creator} [
                        <Moment fromNow locale={i18n.language}>
                          {workflow.creation_date}
                        </Moment>
                        ]
                      </>
                    ) : (
                      <Skeleton />
                    )}
                  </Grid>
                  <Grid item xs={3} sm={4} md={3} lg={3}>
                    <span style={{ fontWeight: 500 }}>{t('edited_by')}:</span>
                  </Grid>
                  <Grid item xs={9} sm={8} md={9} lg={9}>
                    {workflow && workflow.edited_by ? (
                      <>
                        {workflow.edited_by} [
                        <Moment fromNow locale={i18n.language}>
                          {workflow.last_edit}
                        </Moment>
                        ]
                      </>
                    ) : (
                      <Skeleton />
                    )}
                  </Grid>
                  <Grid item xs={3} sm={4} md={3} lg={3}>
                    <span style={{ fontWeight: 500 }}>{t('origin')}:</span>
                  </Grid>
                  <Grid item xs={9} sm={8} md={9} lg={9}>
                    {workflow && workflow ? workflow.origin : <Skeleton />}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        ) : null}
        {currentUser.roles.includes('alert_view') && viewMode === 'read' ? (
          <>
            <Grid item xs={12} style={{ paddingTop: '10px' }}>
              <Histogram
                dataset={histogram}
                height="300px"
                isDate
                title={t('chart.title')}
                datatype={workflow_id || id}
              />
            </Grid>
            <Grid item xs={12} style={{ paddingTop: '10px', paddingBottom: '10px' }}>
              <Typography variant="h6">{t('last10')}</Typography>
            </Grid>
            <Grid item xs={12} style={{ paddingTop: '10px' }}>
              <AlertsTable alertResults={results} allowSort={false} />
            </Grid>
          </>
        ) : null}
      </div>
    </PageCenter>
  ) : (
    <ForbiddenPage />
  );
};

WrappedWorkflowDetail.defaultProps = {
  workflow_id: null,
  close: () => {}
};

const WorkflowDetail = React.memo(WrappedWorkflowDetail);
export default WorkflowDetail;
