import * as React from 'react';
import * as _ from 'lodash';
import { Checkbox, FormGroup, TextArea, TextInput } from '@patternfly/react-core';
import { Dropdown } from '@console/internal/components/utils';
import { ELEMENT_TYPES, networkTypeParams, NetworkTypeParams } from '../../constants';

const handleTypeParamChange = (
  paramKey,
  event,
  elemType,
  networkType,
  setTypeParamsData,
  typeParamsData,
) => {
  const paramsUpdate = { ...typeParamsData };

  if (elemType === ELEMENT_TYPES.CHECKBOX) {
    paramsUpdate[paramKey] = { value: event.target.checked };
  } else if (event.target) {
    paramsUpdate[paramKey] = { value: event.target.value };
  } else {
    paramsUpdate[paramKey] = { value: event };
  }

  _.forOwn(paramsUpdate, (value, key) => {
    if (key === paramKey) {
      const validation = _.get(networkTypeParams[networkType], [key, 'validation'], null);

      paramsUpdate[key].validationMsg = validation ? validation(paramsUpdate) : null;
    }
  });

  setTypeParamsData(paramsUpdate);
};

const getSriovNetNodePolicyResourceNames = (sriovNetNodePoliciesData) => {
  const resourceNames = {};

  sriovNetNodePoliciesData.forEach((policy) => {
    const resourceName = _.get(policy, 'spec.resourceName', '');
    if (resourceName !== '') {
      resourceNames[resourceName] = resourceName;
    }
  });

  return resourceNames;
};

export default (props) => {
  const {
    networkType,
    setTypeParamsData,
    sriovNetNodePoliciesData,
    typeParamsData,
    formGroupsClassName = '',
  } = props;
  const params: NetworkTypeParams = networkType && networkTypeParams[networkType];

  if (_.isEmpty(params)) {
    return null;
  }

  if (networkType === 'sriov') {
    params.resourceName.values = getSriovNetNodePolicyResourceNames(sriovNetNodePoliciesData);
  }

  const dynamicContent = _.map(params, (parameter, key) => {
    const validationMsg = _.get(typeParamsData, [key, 'validationMsg'], null);
    const elemType = _.get(parameter, 'type');
    const validated = validationMsg ? 'error' : 'default';
    const fieldId = `network-type-parameters-${key}`;
    const value = _.get(typeParamsData, `${key}.value`);

    let children;
    switch (elemType) {
      case ELEMENT_TYPES.TEXTAREA:
        children = (
          <TextArea
            id={`${fieldId}-textarea`}
            value={value || ''}
            validated={validated}
            aria-describedby={`${fieldId}-helper`}
            onChange={(event) =>
              handleTypeParamChange(
                key,
                event,
                ELEMENT_TYPES.TEXTAREA,
                networkType,
                setTypeParamsData,
                typeParamsData,
              )
            }
          />
        );
        break;
      case ELEMENT_TYPES.CHECKBOX:
        children = (
          <Checkbox
            id={`${fieldId}-checkbox`}
            label={parameter?.name ?? key}
            onChange={(event) =>
              handleTypeParamChange(
                key,
                event,
                ELEMENT_TYPES.CHECKBOX,
                networkType,
                setTypeParamsData,
                typeParamsData,
              )
            }
            checked={value || false}
          />
        );
        break;
      case ELEMENT_TYPES.DROPDOWN:
        children = (
          <Dropdown
            id={`${fieldId}-dropdown`}
            title={parameter.hintText}
            items={parameter.values}
            dropDownClassName="dropdown--full-width"
            selectedKey={value}
            onChange={(event) =>
              handleTypeParamChange(
                key,
                event,
                ELEMENT_TYPES.DROPDOWN,
                networkType,
                setTypeParamsData,
                typeParamsData,
              )
            }
          />
        );
        break;
      case ELEMENT_TYPES.TEXT:
      default:
        children = (
          <TextInput
            id={`${fieldId}-text`}
            aria-describedby={`${fieldId}-helper`}
            value={value || ''}
            validated={validated}
            onChange={(event) =>
              handleTypeParamChange(
                key,
                event,
                ELEMENT_TYPES.TEXTAREA,
                networkType,
                setTypeParamsData,
                typeParamsData,
              )
            }
          />
        );
    }

    return (
      <FormGroup
        className={formGroupsClassName}
        key={key}
        fieldId={fieldId}
        label={parameter?.name ?? key}
        isRequired={parameter.required}
        validated={validated}
        helperTextInvalid={validationMsg}
      >
        {children}
      </FormGroup>
    );
  });

  return <>{dynamicContent}</>;
};
