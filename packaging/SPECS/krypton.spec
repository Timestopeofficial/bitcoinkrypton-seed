%global __os_install_post %{nil}
%global __arch_install_post %{nil}
%define debug_package %{nil}
%define _topdir %(echo $PWD)/

Name:           krypton
Version:        1.0.0
Release:        1
Summary:        Krypton node.js client

License:        ASL 2.0
URL:            https://timestope.com/
Source0:        https://github.com/Timestopeofficial/krypton.git

%{?systemd_requires}
BuildRequires:  systemd

Requires:       bash
Requires:       systemd

Requires(pre): shadow-utils

AutoReqProv: no


%description
Krypton node.js client


%install
rm -rf $RPM_BUILD_ROOT

sed -i 's:{{ cli_entrypoint }}:node /usr/share/krypton/index.js:' krypton

mkdir -p %{buildroot}%{_bindir}
mkdir -p %{buildroot}%{_sysconfdir}/%{name}
mkdir -p %{buildroot}%{_sysconfdir}/pki/rpm-gpg
mkdir -p %{buildroot}%{_sysconfdir}/yum.repos.d
mkdir -p %{buildroot}%{_datarootdir}/%{name}
mkdir -p %{buildroot}%{_unitdir}
mkdir -p %{buildroot}%{_sharedstatedir}/%{name}

install -m 0755 %{name} %{buildroot}%{_bindir}/
install -m 0600 fakeroot/etc/krypton/%{name}.conf %{buildroot}%{_sysconfdir}/%{name}/
install -m 0666 krypton.repo %{buildroot}%{_sysconfdir}/yum.repos.d/
install -m 0666 RPM-GPG-KEY-krypton %{buildroot}%{_sysconfdir}/pki/rpm-gpg/
install -m 0755 node %{buildroot}%{_datarootdir}/%{name}/
install -m 0644 index.js remote.js keytool.js package.json VERSION %{buildroot}%{_datarootdir}/%{name}/
cp -r build/ lib/ modules/ node-ui/ node_modules/ %{buildroot}%{_datarootdir}/%{name}/
install -m 0644 systemd.service %{buildroot}%{_unitdir}/%{name}.service


%files
%{_bindir}/%{name}
%{_sysconfdir}/yum.repos.d/krypton.repo
%{_sysconfdir}/pki/rpm-gpg/RPM-GPG-KEY-krypton
%{_datarootdir}/%{name}/node
%{_datarootdir}/%{name}/index.js
%{_datarootdir}/%{name}/remote.js
%{_datarootdir}/%{name}/keytool.js
%{_datarootdir}/%{name}/package.json
%{_datarootdir}/%{name}/VERSION
%{_datarootdir}/%{name}/lib
%{_datarootdir}/%{name}/build
%{_datarootdir}/%{name}/modules
%{_datarootdir}/%{name}/node-ui
%{_datarootdir}/%{name}/node_modules
%{_unitdir}/%{name}.service

%defattr(600, krypton, krypton, 700)
%dir %{_sharedstatedir}/%{name}
%config(noreplace) %{_sysconfdir}/%{name}/%{name}.conf


%pre
getent group krypton >/dev/null || groupadd -r krypton
getent passwd krypton >/dev/null || \
    useradd -r -g krypton -d /usr/share/krypton -s /sbin/nologin \
    -c "User with restricted privileges for Krypton daemon" krypton
exit 0


%post
%systemd_post krypton.service


%preun
%systemd_preun krypton.service


%postun
%systemd_postun_with_restart krypton.service
