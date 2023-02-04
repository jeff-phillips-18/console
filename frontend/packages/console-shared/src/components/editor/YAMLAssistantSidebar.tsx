/* eslint-disable @typescript-eslint/camelcase */
import * as React from 'react';
import { Alert, AlertVariant, Button, ButtonVariant, Flex, TextArea } from '@patternfly/react-core';
import { MicrophoneIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import 'regenerator-runtime/runtime';
import { Base64 } from 'js-base64';
import ReactDiffViewer from 'react-diff-viewer';
import { useTranslation } from 'react-i18next';
import MonacoEditor from 'react-monaco-editor';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { k8sGetResource } from '@console/dynamic-plugin-sdk/src/utils/k8s';
import { ThemeContext } from '@console/internal/components/ThemeProvider';
import { ConfigMapModel, SecretModel } from '@console/internal/models';
import { ConfigMapKind, k8sGet, K8sResourceKind } from '@console/internal/module/k8s';
import CloseButton from '../close-button';

import './YAMLAssistantSidebar.scss';

const OPEN_API_COMPLETIONS_URL = 'api/v1/jobs';

type WidsdomJobDataType = {
  mode: string;
  model_id: string;
  prompt: string;
  task_id: string;
};

const WisdomForOCPBody: WidsdomJobDataType = {
  mode: 'synchronous',
  task_id: '3',
  model_id:
    'L3Byb2plY3RzL2Jsb29tei0xYjcvc3RhY2tvdmVyZmxvdy1kYXRhLWFsbC10YWdzL21hcmtkb3duLzVlNi0yMGVwb2Nocy9jaGVja3BvaW50LTkwMzky',
  prompt: '',
};

type YAMLAssistantSidebarProps = {
  editorRef: React.MutableRefObject<MonacoEditor>;
  sidebarLabel?: string;
  toggleSidebar: () => void;
};

const YAMLAssistantSidebar: React.FC<YAMLAssistantSidebarProps> = ({
  editorRef,
  sidebarLabel,
  toggleSidebar,
}) => {
  const { t } = useTranslation();
  const [pending, setPending] = React.useState<boolean>();
  const [entry, setEntry] = React.useState<string>();
  const [previewEdits, setPreviewEdits] = React.useState<string>();
  const [wisdomEndpoint, setWisdomEndpoint] = React.useState<string>();
  const [wisdomAPIKey, setWisdomAPIKey] = React.useState<string>();
  const [wisdomAPIEmail, setWisdomAPIEmail] = React.useState<string>();
  const [completionError, setCompletionError] = React.useState<string | undefined>();
  const theme = React.useContext(ThemeContext);
  const editor = editorRef.current?.editor;
  const timeoutRef = React.useRef(null);
  const transcriptRef = React.useRef<string | undefined>();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  React.useEffect(() => {
    let ignore = false;

    const getWisdomApiKey = async () => {
      let secret: K8sResourceKind;
      try {
        secret = await k8sGet(SecretModel, 'wisdom-api', 'openshift-config', null);
      } catch (e) {
        setCompletionError('Unable to find Wisdom API key');
        return;
      }
      if (ignore) return;

      if (secret) {
        setWisdomAPIKey(Base64.decode(secret.data?.apiKey));
        setWisdomAPIEmail(Base64.decode(secret.data?.email));
      }
    };

    getWisdomApiKey();

    return () => {
      ignore = true;
    };
  }, []);

  React.useEffect(() => {
    let ignore = false;

    k8sGetResource<ConfigMapKind>({
      model: ConfigMapModel,
      name: 'wisdom-api-endpoint',
      ns: 'openshift-config',
    })
      .then((configMap) => {
        if (!ignore && configMap) {
          setWisdomEndpoint(configMap.data?.endpoint);
        }
      })
      .catch(() => {
        setCompletionError('Unable to Wisdom Endpoint');
      });

    return () => {
      ignore = true;
    };
  }, []);

  const startListening = React.useCallback(() => {
    transcriptRef.current = '';
    SpeechRecognition.startListening({
      continuous: true,
    });
  }, []);

  const stopListening = React.useCallback(() => {
    SpeechRecognition.stopListening();
    setEntry(transcript);
    resetTranscript();
  }, [resetTranscript, transcript]);

  const onAccept = () => {
    editor.setValue(previewEdits);
    setEntry('');
    resetTranscript();
    requestAnimationFrame(() => {
      setPreviewEdits('');
      setPending(false);
    });
  };

  const onReject = () => {
    setPreviewEdits('');
    setPending(false);
  };

  const onSubmit = React.useCallback(() => {
    setCompletionError(undefined);

    const currentValue = editor.getValue();
    const currentEntry = currentValue ? `\`\`\`\n${currentValue}\n\`\`\`\n` : '';

    const URL = `${wisdomEndpoint}/${OPEN_API_COMPLETIONS_URL}`;
    const body = {
      ...WisdomForOCPBody,
      prompt: `${currentEntry}${entry || transcriptRef.current}`,
    };

    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${wisdomAPIKey}`,
        Email: `${wisdomAPIEmail}`,
      },
      body: JSON.stringify(body),
    };

    setPending(true);
    fetch(URL, options)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        if (data) {
          if (data.error) {
            setCompletionError(data.error.message);
            setPending(false);
            return;
          }
          const { task_output } = data;
          if (task_output) {
            setPreviewEdits(task_output.replace(/^[`\s]+|[`\s]+$/g, ''));
          } else {
            setPending(false);
          }
        }
      })
      .catch((error) => {
        setPending(false);
        setCompletionError(error.message);
      });
  }, [editor, entry, wisdomAPIEmail, wisdomAPIKey, wisdomEndpoint]);

  React.useEffect(() => {
    if (listening && transcript && transcript !== transcriptRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      transcriptRef.current = transcript;
      timeoutRef.current = setTimeout(() => {
        stopListening();
        requestAnimationFrame(() => {
          onSubmit();
        });
      }, 2000);
    }
  }, [listening, onSubmit, stopListening, transcript]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div
      className="ocs-yaml-assistant co-p-has-sidebar__sidebar co-p-has-sidebar__sidebar--bordered hidden-sm hidden-xs"
      data-test="yaml-assistant-sidebar"
    >
      <div className="co-m-pane__body co-p-has-sidebar__sidebar-body">
        <div>
          <CloseButton
            additionalClassName="co-close-button--float-right co-p-has-sidebar__close-button"
            onClick={toggleSidebar}
          />
          <h2 className="co-p-has-sidebar__sidebar-heading text-capitalize">{sidebarLabel}</h2>
          <div>{t('console-shared~Enter any prompt and get YAML snippet back!')}</div>
          <div className="pf-u-mr-md pf-u-mb-sm pf-u-mt-xs">
            <TextArea
              className="ocs-yaml-assistant__input-area"
              value={entry || transcript}
              onChange={(value) => setEntry(value)}
              aria-label="enter description"
              onKeyDown={onKeyDown}
              isDisabled={pending || listening}
              resizeOrientation="vertical"
            />
          </div>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            {entry && !pending ? (
              <Button
                className="pf-u-px-0"
                variant={ButtonVariant.link}
                onClick={() => setEntry('')}
              >
                Clear
              </Button>
            ) : (
              <span />
            )}
            <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
              <Button
                variant={ButtonVariant.secondary}
                onClick={onSubmit}
                isDisabled={pending || !entry}
              >
                {pending && !previewEdits ? (
                  <div
                    className="co-m-loader co-an-fade-in-out ocs-yaml-assistant__pending-button"
                    data-test="loading-indicator"
                  >
                    <div className="co-m-loader-dot__one" />
                    <div className="co-m-loader-dot__two" />
                    <div className="co-m-loader-dot__three" />
                  </div>
                ) : (
                  <>{t('console-shared~Submit')}</>
                )}
              </Button>
              {browserSupportsSpeechRecognition ? (
                <Button
                  className={css('ocs-yaml-assistant__mic-button', listening && 'm-is-listening')}
                  variant={ButtonVariant.secondary}
                  onClick={() => (listening ? stopListening() : startListening())}
                  isDisabled={pending || !!entry}
                  aria-label="activate microphone"
                >
                  <MicrophoneIcon />
                </Button>
              ) : null}
            </Flex>
          </Flex>
          {completionError ? (
            <Alert
              className="pf-u-mt-sm"
              variant={AlertVariant.danger}
              isInline
              title={t('console-shared~Unable to translate')}
            >
              {completionError}
            </Alert>
          ) : null}
        </div>
        {previewEdits ? (
          <div className="ocs-yaml-assistant__preview">
            <div>{t('console-shared~Preview')}</div>
            <div className="ocs-yaml-assistant__preview-text">
              <ReactDiffViewer
                oldValue={editor.getValue()}
                newValue={previewEdits}
                splitView={false}
                useDarkTheme={theme === 'dark'}
              />
            </div>
            <Flex className="pf-u-mt-sm" justifyContent={{ default: 'justifyContentFlexStart' }}>
              <Button variant={ButtonVariant.secondary} onClick={onAccept}>
                {t('console-shared~Accept')}
              </Button>
              <Button variant={ButtonVariant.plain} onClick={onReject}>
                {t('console-shared~Reject')}
              </Button>
            </Flex>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default YAMLAssistantSidebar;
