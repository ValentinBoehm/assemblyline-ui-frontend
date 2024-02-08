import ArchiveIcon from '@mui/icons-material/Archive';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { AlertTitle, IconButton, Skeleton, TableContainer, Tooltip, useTheme } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import useMyAPI from 'components/hooks/useMyAPI';
import useMySnackbar from 'components/hooks/useMySnackbar';
import { File } from 'components/routes/archive/detail';
import {
  GridLinkRow,
  GridTable,
  GridTableBody,
  GridTableCell,
  GridTableHead,
  GridTableRow,
  StyledPaper
} from 'components/visual/GridTable';
import InformativeAlert from 'components/visual/InformativeAlert';
import SectionContainer from 'components/visual/SectionContainer';
import { safeFieldValueURI } from 'helpers/utils';
import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const useStyles = makeStyles(theme => ({
  container: {
    width: '100%',
    padding: theme.spacing(1)
  },
  caption: {
    display: 'grid',
    gridTemplateRows: 'repeat(2, 1fr)',
    gridTemplateColumns: '1fr auto',
    marginBottom: theme.spacing(1),
    borderRadius: '4px 4px 0px 0px',
    '&>div': {
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  },
  muted: {
    color: theme.palette.text.secondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
}));

const DEFAULT_SIMILAR = {
  tlsh: { label: 'TLSH' },
  ssdeep1: { label: 'SSDEEP' },
  ssdeep2: { label: 'SSDEEP' },
  vector: { label: 'Vector' }
};

type Item = { sha256: string; type: string; seen: { last: string } };

type Result = {
  items: Item[];
  offset: number;
  rows: number;
  total: number;
};

type Similar = Record<keyof typeof DEFAULT_SIMILAR, Record<string, Result>>;

type SectionProps = {
  file: File;
  show?: boolean;
  title?: string;
  drawer?: boolean;
  nocollapse?: boolean;
};

const WrappedSimilarSection: React.FC<SectionProps> = ({
  file,
  show = false,
  title = null,
  drawer = false,
  nocollapse = false
}) => {
  const { t, i18n } = useTranslation(['archive']);
  const theme = useTheme();
  const classes = useStyles();

  const { apiCall } = useMyAPI();
  const { showErrorMessage } = useMySnackbar();

  const [data, setData] = useState<Similar>(null);

  const nbOfValues = useMemo<number | null>(
    () =>
      data &&
      Object.keys(DEFAULT_SIMILAR)
        .map(k => (k in data && data[k]?.total ? data[k]?.total : 0))
        .reduce((a, v) => a + v),
    [data]
  );

  const similar = useMemo<Record<keyof typeof DEFAULT_SIMILAR, { value: string; to: string }>>(() => {
    let base = {
      tlsh: { value: '', to: '' },
      ssdeep1: { value: '', to: '' },
      ssdeep2: { value: '', to: '' },
      vector: { value: '', to: '' }
    };
    if (!file) return base;

    const tlsh = file?.file_info?.tlsh ? file?.file_info?.tlsh : '';
    base = { ...base, tlsh: { value: tlsh, to: `/search/file?query=tlsh:${safeFieldValueURI(tlsh)}` } };

    const ssdeep = file?.file_info?.ssdeep?.split(':');
    base = {
      ...base,
      ssdeep1: { value: ssdeep[1], to: `/search/file?query=ssdeep:${safeFieldValueURI(ssdeep[1]) + '~'}` },
      ssdeep2: { value: ssdeep[2], to: `/search/file?query=ssdeep:${safeFieldValueURI(ssdeep[2]) + '~'}` }
    };

    const vector = file?.tags?.vector?.join(' ') ? file?.tags?.vector?.join(' ') : '';
    base = {
      ...base,
      vector: {
        value: vector,
        to: `/search/file?query=result.sections.tags.vector:${safeFieldValueURI(vector)}`
      }
    };

    return base;
  }, [file]);

  useEffect(() => {
    if (!file || data) return;
    apiCall({
      method: 'GET',
      url: `/api/v4/archive/details/${file?.file_info?.sha256}/`,
      onSuccess: api_data => setData(api_data.api_response),
      onFailure: api_data => showErrorMessage(api_data.api_error_message)
    });
    // eslint-disable-next-line
  }, [file]);

  useEffect(() => {
    return () => {
      setData(null);
    };
  }, [file]);

  return show || (data && nbOfValues > 0) ? (
    <SectionContainer
      title={title ?? t('similar')}
      nocollapse={nocollapse}
      slotProps={{
        wrapper: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2)
          }
        }
      }}
    >
      {!data ? (
        <Skeleton variant="rectangular" style={{ height: '6rem', borderRadius: '4px' }} />
      ) : nbOfValues === 0 ? (
        <div style={{ width: '100%' }}>
          <InformativeAlert>
            <AlertTitle>{t('no_similar_title')}</AlertTitle>
            {t('no_similar_desc')}
          </InformativeAlert>
        </div>
      ) : (
        Object.keys(DEFAULT_SIMILAR).map(
          (k, i) =>
            k in data &&
            data[k].total > 0 &&
            (() => {
              const hasArchived = data[k].items.some(item => item?.from_archive);
              return (
                <StyledPaper key={i} className={classes.container} paper={!drawer} variant="outlined">
                  <div className={classes.caption}>
                    <div>
                      <b>{t(DEFAULT_SIMILAR[k].label)}</b>&nbsp;
                      <small className={classes.muted}>{` :: ${similar[k].value}}`}</small>
                    </div>
                    <div style={{ gridRow: 'span 2' }}>
                      <Tooltip title={t('search.tooltip')} placement="left">
                        <IconButton
                          component={Link}
                          size="small"
                          to={`${similar[k].to}#${file?.file_info?.sha256}`}
                          onClick={e => e.stopPropagation()}
                          style={{ margin: `0 ${theme.spacing(0.5)}` }}
                        >
                          <SearchOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                    <div>
                      <small style={{ color: theme.palette.primary.main }}>
                        {data[k].total}&nbsp;{t(`result${data[k].total === 1 ? '' : 's'}`)}
                      </small>
                    </div>
                  </div>
                  <TableContainer
                    style={{
                      overflow: 'hidden',
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.spacing(0.5)
                    }}
                  >
                    <GridTable
                      columns={hasArchived ? 5 : 4}
                      size="small"
                      paper={drawer}
                      style={{
                        gridTemplateColumns: hasArchived
                          ? `min-content minmax(auto, 1fr) minmax(auto, 3fr) minmax(auto, 1fr)`
                          : `minmax(auto, 1fr) minmax(auto, 3fr) minmax(auto, 1fr)`
                      }}
                    >
                      <GridTableHead>
                        <GridTableRow>
                          {hasArchived && <GridTableCell />}
                          <GridTableCell children={t('header.seen.last')} />
                          <GridTableCell children={t('header.sha256')} />
                          <GridTableCell children={t('header.type')} />
                        </GridTableRow>
                      </GridTableHead>
                      <GridTableBody alternating>
                        {data[k].items.map((item, j) => (
                          <GridLinkRow
                            key={`${i}-${j}`}
                            hover
                            to={item?.from_archive ? `/archive/${item?.sha256}` : `/file/detail/${item?.sha256}`}
                          >
                            {hasArchived && (
                              <GridTableCell sx={{ '&.MuiTableCell-root>div': { justifyItems: 'flex-start' } }}>
                                {item?.from_archive && (
                                  <Tooltip title={t('file.from_archive')} placement="right">
                                    <span>
                                      <IconButton size="small" disabled>
                                        <ArchiveIcon fontSize="small" style={{ color: theme.palette.text.primary }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                )}
                              </GridTableCell>
                            )}

                            <GridTableCell>
                              <Tooltip title={item.seen.last}>
                                <span>{moment(item.seen.last).locale(i18n.language).fromNow()}</span>
                              </Tooltip>
                            </GridTableCell>

                            <GridTableCell>{item?.sha256}</GridTableCell>

                            <GridTableCell>{item?.type}</GridTableCell>
                          </GridLinkRow>
                        ))}
                      </GridTableBody>
                    </GridTable>
                  </TableContainer>
                </StyledPaper>
              );
            })()
        )
      )}
    </SectionContainer>
  ) : null;
};

export const SimilarSection = React.memo(WrappedSimilarSection);
export default SimilarSection;
