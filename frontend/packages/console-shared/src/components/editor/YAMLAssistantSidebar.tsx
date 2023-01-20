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
import { ThemeContext } from '@console/internal/components/ThemeProvider';
import { SecretModel } from '@console/internal/models';
import { k8sGet, K8sResourceKind } from '@console/internal/module/k8s';
import CloseButton from '../close-button';

import './YAMLAssistantSidebar.scss';

const OPEN_API_COMPLETIONS_URL = 'https://api.openai.com/v1/completions';
const OPEN_API_EDITS_URL = 'https://api.openai.com/v1/edits';

type OpenAPIDataType = {
  model: string;
  prompt?: string;
  input?: string;
  instruction?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
};

const OPEN_API_NEW_DATA: OpenAPIDataType = {
  model: 'text-davinci-002',
  temperature: 0,
  max_tokens: 300,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
};

const OPEN_API_EDIT_DATA: OpenAPIDataType = {
  model: 'text-davinci-edit-001',
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
  const [openAIApiKey, setOpenAIApiKey] = React.useState<string>();
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

    const getOpenAIApiKey = async () => {
      let secret: K8sResourceKind;
      try {
        secret = await k8sGet(SecretModel, 'open-ai', 'openshift-config', null);
      } catch (e) {
        setCompletionError('Unable to find OpenAI API key');
        return;
      }
      if (ignore) return;

      if (secret) {
        setOpenAIApiKey(Base64.decode(secret.data?.apiKey));
      }
    };

    getOpenAIApiKey();

    return () => {
      ignore = true;
    };
  }, []);

  const startListening = React.useCallback(() => {
    SpeechRecognition.startListening({
      continuous: true,
    });
  }, []);

  const stopListening = React.useCallback(() => {
    SpeechRecognition.stopListening();
    setEntry(transcript);
    resetTranscript();
    transcriptRef.current = '';
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

    const URL = currentValue ? OPEN_API_EDITS_URL : OPEN_API_COMPLETIONS_URL;
    let body: OpenAPIDataType;
    if (!currentValue) {
      body = { ...OPEN_API_NEW_DATA, prompt: entry };
    } else {
      body = { ...OPEN_API_EDIT_DATA, input: currentValue, instruction: entry };
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIApiKey}`,
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
          const { choices } = data;
          if (choices.length) {
            setPreviewEdits(choices[0].text.replace(/^\s+|\s+$/g, ''));
          } else {
            setPending(false);
          }
        }
      })
      .catch((error) => {
        setPending(false);
        setCompletionError(error.message);
      });
  }, [editor, entry, openAIApiKey]);

  React.useEffect(() => {
    if (listening && transcript && transcript !== transcriptRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        stopListening();
        onSubmit();
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
