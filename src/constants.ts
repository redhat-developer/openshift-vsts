export const OPENSHIFT_V3_BASE_URL =
  'https://mirror.openshift.com/pub/openshift-v3/clients';
export const OPENSHIFT_V4_BASE_URL =
  'https://mirror.openshift.com/pub/openshift-v4/clients/oc';

export const LINUX = 'linux';
export const MACOSX = 'macosx';
export const WIN = 'windows';
export const LATEST = 'latest';

export const OC_TAR_GZ = 'oc.tar.gz';
export const OC_ZIP = 'oc.zip';

export const OPENSHIFT_LATEST_VERSION: Map<string, string> = new Map<string, string>();
OPENSHIFT_LATEST_VERSION.set('3.3', '3.3.1.46.45');
OPENSHIFT_LATEST_VERSION.set('3.4', '3.4.1.44.57');
OPENSHIFT_LATEST_VERSION.set('3.5', '3.5.5');
OPENSHIFT_LATEST_VERSION.set('3.6', '3.6');
OPENSHIFT_LATEST_VERSION.set('3.7', '3.7.126');
OPENSHIFT_LATEST_VERSION.set('3.8', '3.8.46');
OPENSHIFT_LATEST_VERSION.set('3.9', '3.9.103');
OPENSHIFT_LATEST_VERSION.set('3.10', '3.10.183');
OPENSHIFT_LATEST_VERSION.set('3.11', '3.11.154');
